/**
 * @typedef {Object} CanvasItem
 * @property {string} id
 * @property {"step"|"drawing"|"text"|"image"|"shape"} type
 * @property {string} content
 * @property {"latex"|"text"|"svg"|"url"} [format]
 * @property {number[]} points
 * @property {number} x
 * @property {number} y
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} observation
 * @property {string} createdAt
 * @property {"user"|"agent"|"imported"} [creator]
 * @property {object} [meta]
 */

/**
 * @type {{ message: string; data: CanvasItem[] }}
 */
export const whiteboardResponseSchema = {
  message: "Whiteboard fetched successfully",
  data: [
    {
      id: "item-1",
      type: "step",
      author: "tutor",
      content: "\\(5 + 4\\)",
      format: "latex",
      points: [],
      x: 100,
      y: 150,
      width: 200,
      height: 50,
      stroke: "#000000",
      strokeWidth: 2,
      observation: "Primero…",
      createdAt: "2025-06-05T18:34:23.425Z",
      creator: "agent",
      meta: {
        confidence: 0.95,
      },
    },
  ],
}
