import {
  MAX_PIXEL_INDEX,
  MIN_PIXEL_INDEX,
  nodeToCameraMap,
  nodeToStripsMap,
} from "./config";
import { Pixel, SolidEvent } from "./events";
import { NanodetDetection } from "./types";

export function mapDetectionsToNodeList(
  detections: NanodetDetection[]
): number[] {
  const nodeList: number[] = [];
  detections.forEach((detection) => {
    const nodeIdx = mapDetectionToNode(detection);
    if (nodeIdx !== null) {
      nodeList.push(nodeIdx);
    }
  });
  return [...new Set(nodeList)];
}

function mapDetectionToNode(detection: NanodetDetection): number | null {
  let nodeIdxToReturn = null;
  nodeToCameraMap.windowCam.forEach((node, nodeIdx) => {
    if (
      node.x > detection.x1 &&
      node.x < detection.x2 &&
      node.y > detection.y1 &&
      node.y < detection.y2
    ) {
      nodeIdxToReturn = nodeIdx;
    }
  });
  return nodeIdxToReturn;
}

// PLAN OF ATTACK
// detection$.pipe(
//    map(detectionsToDetectionEvents), map bounding boxes and cam id onto a node id
//    bufferTime() group a bunch of node ids
//    map(deduplicate)
//    mergeMap(listOfNodesToAllPairs)
//    groupBy(pairToPairKey)
//    mergeMap(o => {
//      return o.pipe(
//      )
//  .subscribe(nodeListToBehaviour)
// TEST FOR SOLID
// For each node in node map, send a solid event

export function mapNodeListToSolidEvents(
  nodes: number[] | number,
  color: number[],
  duration: number,
  width: number
): SolidEvent[] {
  if (!Array.isArray(nodes)) {
    nodes = [nodes];
  }
  return nodes.flatMap((nodeIdx) => {
    const pixelIdxPerStrip = nodeToStripsMap[nodeIdx];
    return pixelIdxPerStrip.map((pixelIdx, stripIdx) =>
      mapNodeStripPixelToSolidEvent(pixelIdx, stripIdx, color, duration, width)
    );
  });
}

export function mapNodeStripPixelToSolidEvent(
  pixelIdx: number | null,
  stripIdx: number,
  color: number[],
  duration: number,
  width: number
): SolidEvent {
  if (pixelIdx === null) {
    return {
      type: "solid",
      color: color,
      duration: duration,
      pixels: [],
    };
  }

  // create an array of pixels based on node_width
  const pixels: Pixel[] = [];
  for (let i = -width; i <= width; i++) {
    const currentPixelIdx = pixelIdx + i;
    if (
      currentPixelIdx < MIN_PIXEL_INDEX ||
      currentPixelIdx > MAX_PIXEL_INDEX
    ) {
      continue;
    }
    pixels.push({ strip_idx: stripIdx, pixel_idx: pixelIdx + i });
  }

  return {
    type: "solid",
    color: color,
    duration: duration,
    pixels,
  };
}
