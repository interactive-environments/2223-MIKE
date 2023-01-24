import {
  MESSAGE_COLOR,
  MESSAGE_DURATION_DIVIDER,
  MESSAGE_FADE_DURATION,
  MESSAGE_FADE_POWER,
  MESSAGE_INCLUDE_BACKWARDS,
  MESSAGE_PACE,
  MESSAGE_WIDTH,
  NODE_SOLID_WIDTH,
  SINGLE_COLOR,
  SINGLE_INCLUDE_BACKWARDS,
  SINGLE_LED_DURATION,
  SINGLE_SOUND_MESSAGES,
  SINGLE_SOUND_REL_PATH,
  SINGLE_WIDTH,
} from "./config";
import { getLinkedMessagesDurationInMs } from "./events";
import {
  mapNodeListToConstantEvents,
  mapNodesToEventsWithDuration,
  mapNodesToEventsWithPace,
} from "./mappers";
import { edges, getSegments } from "./path-finding";
import { dispatchEvents } from "./serial";
import { playSound } from "./sounds";
import { loadStripsMap } from "./utils";

export const singleBehaviourHandlers = new Map<
  number,
  (nodeList: number[]) => void
>();

// For each node, create a handler
loadStripsMap().forEach((_, nodeIdx) => {
  singleBehaviourHandlers.set(nodeIdx, createSingleBehaviourHandler(nodeIdx));
});

export const messageBehaviourHandlers = new Map<
  string,
  (nodePair: number[]) => void
>();

// For each pair of nodes, create a handler
loadStripsMap().forEach((_, nodeIdx) => {
  loadStripsMap().forEach((_, otherNodeIdx) => {
    if (otherNodeIdx <= nodeIdx) return;
    const key =
      nodeIdx < otherNodeIdx
        ? `${nodeIdx}-${otherNodeIdx}`
        : `${otherNodeIdx}-${nodeIdx}`;
    messageBehaviourHandlers.set(key, createMessageBehaviourHandler(key));
  });
});

function createMessageBehaviourHandler(key: string) {
  // create all the events to be dispatched and record the duration
  const startNode = parseInt(key.split("-")[0]);
  const endNode = parseInt(key.split("-")[1]);
  const firstMessageEvent = mapNodesToEventsWithPace(
    // Subsequent are linked
    startNode,
    endNode,
    MESSAGE_COLOR,
    MESSAGE_WIDTH,
    MESSAGE_PACE,
    MESSAGE_INCLUDE_BACKWARDS
  );

  const totalDuration =
    getLinkedMessagesDurationInMs(firstMessageEvent) / MESSAGE_DURATION_DIVIDER;

  // Also we want to create solid events with green at each node

  const nodesInMessage = getSegments(startNode, endNode).flatMap((segment) => [
    segment.start_node,
    segment.end_node,
  ]);
  const fadeInOutMessageEvents = mapNodeListToConstantEvents(
    // [...new Set(nodesInMessage)],
    [startNode, endNode],
    MESSAGE_COLOR,
    totalDuration,
    NODE_SOLID_WIDTH,
    MESSAGE_FADE_DURATION,
    MESSAGE_FADE_DURATION,
    MESSAGE_FADE_POWER
  );

  let lastDispatchTime = new Date().getTime() - totalDuration - 1;

  return function (nodePair: number[]): void {
    const currentKey =
      nodePair[0] < nodePair[1]
        ? `${nodePair[0]}-${nodePair[1]}`
        : `${nodePair[1]}-${nodePair[0]}`;
    if (currentKey !== key) return;
    if (new Date().getTime() - lastDispatchTime < totalDuration) return;
    lastDispatchTime = new Date().getTime();
    dispatchEvents([...fadeInOutMessageEvents, firstMessageEvent]);
  };
}

function createSingleBehaviourHandler(
  nodeIdx: number
): (nodeList: number[]) => void {
  const connectedEdges = edges.filter((edge) => edge.start_node === nodeIdx);
  const events = connectedEdges.map((edge) =>
    mapNodesToEventsWithDuration(
      nodeIdx,
      edge.end_node,
      SINGLE_COLOR,
      SINGLE_WIDTH,
      SINGLE_LED_DURATION,
      SINGLE_INCLUDE_BACKWARDS
    )
  );

  let lastMessageTime = new Date().getTime() - SINGLE_LED_DURATION - 1;
  let lastSoundTime =
    new Date().getTime() - SINGLE_LED_DURATION * SINGLE_SOUND_MESSAGES - 1;

  return function (nodeList: number[]): void {
    if (nodeList.length !== 1 || nodeList[0] !== nodeIdx) return;

    if (
      new Date().getTime() - lastSoundTime >
      SINGLE_LED_DURATION * SINGLE_SOUND_MESSAGES
    ) {
      lastSoundTime = new Date().getTime();
      playSound(SINGLE_SOUND_REL_PATH, false);
    }

    if (new Date().getTime() - lastMessageTime > SINGLE_LED_DURATION) {
      lastMessageTime = new Date().getTime();
      dispatchEvents(events);
    }
  };
}
