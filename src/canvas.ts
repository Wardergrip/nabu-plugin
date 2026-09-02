import { App, TFile, WorkspaceLeaf } from "obsidian";

/**
 * Canvas has no official plugin API. The interfaces below describe only the
 * slice of Canvas's internal runtime shape this file touches - they are
 * hand-written from observed behavior, not exhaustive, and may need
 * updating after an Obsidian release changes Canvas internals. Keeping
 * them local (rather than depending on an external typings package) means
 * this file is the only thing that needs fixing if that happens, and it
 * can't fail to resolve in CI.
 */

interface CanvasBBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

interface CanvasNode {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	/** Present on file-backed nodes (attachments, linked notes). */
	file?: TFile;
}

interface CanvasData {
	nodes: Record<string, unknown>[];
	edges: Record<string, unknown>[];
}

interface CanvasController {
	selection: Set<unknown>;
	nodes: Map<string, CanvasNode>;
	getData(): CanvasData;
	setData(data: CanvasData): void;
	requestSave(): void;
	deselectAll(): void;
	updateSelection(fn: () => void): void;
}

interface CanvasFileView {
	getViewType(): string;
	canvas: CanvasController;
}

const CANVAS_VIEW_TYPE = "canvas";

/** Returns the active Canvas view's `canvas` controller, or null if the active leaf isn't a canvas. */
export function getActiveCanvas(app: App): CanvasController | null {
	const leaf: WorkspaceLeaf | null = app.workspace.activeLeaf;
	if (!leaf) return null;
	const view = leaf.view as unknown as CanvasFileView;
	if (view.getViewType() !== CANVAS_VIEW_TYPE) return null;
	return view.canvas ?? null;
}

/** Nodes in the current selection (edges are filtered out). */
function getSelectedNodes(canvas: CanvasController): CanvasNode[] {
	const nodes: CanvasNode[] = [];
	for (const item of canvas.selection) {
		// Duck-type: canvas nodes have x/y/width/height, edges don't.
		const maybeNode = item as Partial<CanvasNode>;
		if (
			typeof maybeNode.x === "number" &&
			typeof maybeNode.y === "number" &&
			typeof maybeNode.width === "number" &&
			typeof maybeNode.height === "number"
		) {
			nodes.push(maybeNode as CanvasNode);
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
export function groupSelection(canvas: CanvasController): boolean {
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

	const bbox: CanvasBBox = {
		minX: minX - GROUP_PADDING,
		minY: minY - GROUP_PADDING,
		maxX: maxX + GROUP_PADDING,
		maxY: maxY + GROUP_PADDING,
	};

	const id = randomId();
	const data = canvas.getData();
	data.nodes.push({
		id,
		type: "group",
		x: bbox.minX,
		y: bbox.minY,
		width: bbox.maxX - bbox.minX,
		height: bbox.maxY - bbox.minY,
		label: "Group",
	});

	canvas.setData(data);
	canvas.requestSave();

	const groupNode = canvas.nodes.get(id);
	if (groupNode) {
		canvas.deselectAll();
		canvas.updateSelection(() => {
			canvas.selection = new Set([groupNode]);
		});
	}

	return true;
}

/**
 * If exactly one canvas node is selected and it's a file-backed node
 * (an attachment or a linked note), opens Obsidian's rename prompt for
 * that file. Returns false (and does nothing) otherwise.
 */
export function renameSelectedNode(app: App, canvas: CanvasController): boolean {
	const nodes = getSelectedNodes(canvas);
	if (nodes.length !== 1) return false;

	const node = nodes[0];
	if (!node) return false;

	const file = node.file;
	if (!file) return false;

	void app.fileManager.promptForFileRename(file);
	return true;
}