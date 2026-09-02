import { App, TFile, WorkspaceLeaf } from "obsidian";
import type {
	BBox,
	CanvasView,
	CanvasViewCanvas,
	CanvasViewCanvasNode,
} from "obsidian-typings";

/**
 * Everything in this file talks to Obsidian's Canvas view through its
 * undocumented internal API (there is no official plugin API for Canvas).
 * The shapes used here come from the community-maintained `obsidian-typings`
 * project, which reverse-engineers Obsidian's internals from the app build.
 *
 * If a future Obsidian release changes how Canvas stores nodes/selection,
 * this is the only file that should need updating.
 */

const CANVAS_VIEW_TYPE = "canvas";

/** Returns the active Canvas view's `canvas` controller, or null if the active leaf isn't a canvas. */
export function getActiveCanvas(app: App): CanvasViewCanvas | null {
	const leaf: WorkspaceLeaf | null = app.workspace.activeLeaf;
	if (!leaf) return null;
	const view = leaf.view;
	if (view.getViewType() !== CANVAS_VIEW_TYPE) return null;
	return (view as unknown as CanvasView).canvas ?? null;
}

/** Nodes in the current selection (edges are filtered out). */
function getSelectedNodes(canvas: CanvasViewCanvas): CanvasViewCanvasNode[] {
	const nodes: CanvasViewCanvasNode[] = [];
	for (const item of canvas.selection) {
		// Duck-type: canvas nodes have x/y/width/height, edges don't.
		const maybeNode = item as unknown as CanvasViewCanvasNode;
		if (
			typeof maybeNode?.x === "number" &&
			typeof maybeNode?.y === "number" &&
			typeof maybeNode?.width === "number" &&
			typeof maybeNode?.height === "number"
		) {
			nodes.push(maybeNode);
		}
	}
	return nodes;
}

function randomId(): string {
	// Matches the 16-char lowercase-hex id format Canvas uses for nodes/edges.
	let id = "";
	for (let i = 0; i < 16; i++) id += Math.floor(Math.random() * 16).toString(16);
	return id;
}

const GROUP_PADDING = 24;

/**
 * Groups the currently selected canvas nodes by creating a new group node
 * sized to their combined bounding box, then selects the new group.
 * Mirrors what the built-in "group selection" toolbar button does, but is
 * reachable as a command (and therefore rebindable to a hotkey).
 */
export function groupSelection(canvas: CanvasViewCanvas): boolean {
	const nodes = getSelectedNodes(canvas);
	if (nodes.length === 0) return false;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const node of nodes) {
		minX = Math.min(minX, node.x);
		minY = Math.min(minY, node.y);
		maxX = Math.max(maxX, node.x + node.width);
		maxY = Math.max(maxY, node.y + node.height);
	}

	const bbox: BBox = {
		minX: minX - GROUP_PADDING,
		minY: minY - GROUP_PADDING,
		maxX: maxX + GROUP_PADDING,
		maxY: maxY + GROUP_PADDING,
	};

	const id = randomId();
	const data = canvas.getData() as {
		nodes: Record<string, unknown>[];
		edges: Record<string, unknown>[];
	};
	data.nodes.push({
		id,
		type: "group",
		x: bbox.minX,
		y: bbox.minY,
		width: bbox.maxX - bbox.minX,
		height: bbox.maxY - bbox.minY,
		label: "Group",
	});

	canvas.setData(data as never);
	canvas.requestSave(undefined as never);

	const groupNode = canvas.nodes.get(id);
	if (groupNode) {
		canvas.deselectAll();
		canvas.updateSelection(() => {
			canvas.selection = new Set([groupNode as never]);
		});
	}

	return true;
}

/**
 * If exactly one canvas node is selected and it's a file-backed node
 * (an attachment or a linked note), opens Obsidian's rename prompt for
 * that file. Returns false (and does nothing) otherwise.
 */
export function renameSelectedNode(app: App, canvas: CanvasViewCanvas): boolean {
	const nodes = getSelectedNodes(canvas);
	if (nodes.length !== 1) return false;

	const file: TFile | undefined = nodes[0].file;
	if (!file) return false;

	void app.fileManager.promptForFileRename(file);
	return true;
}
