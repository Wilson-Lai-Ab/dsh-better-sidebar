window.__ModuleLoader__.load({
	id: "dsh-external/dsh-better-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __defProp = Object.defineProperty;
		var __esmMin = (fn, res, err) => () => {
			if (err) throw err[0];
			try {
				return fn && (res = fn(fn = 0)), res;
			} catch (e) {
				throw err = [e], e;
			}
		};
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
		//#endregion
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/prefs-shared.ts
		/** Clamp one width percent into the contract range (shared by schema and client reads). */
		function clampWidthPercent(value) {
			return Math.min(60, Math.max(20, Math.round(value)));
		}
		/** Clamp one terminal font size into the contract range (shared by schema and client reads). */
		function clampTerminalFontSize(value) {
			return Math.min(32, Math.max(9, Math.round(value)));
		}
		/** Clamp one title-bar strip height into the contract range (shared by schema and client reads). */
		function clampTitleBarStrip(value) {
			return Math.min(120, Math.max(0, Math.round(value)));
		}
		/** Clamp the conversation-header tab cap into the contract range. */
		function clampCenterTabMax(value) {
			return Math.min(100, Math.max(1, Math.round(value)));
		}
		/** Clamp the Review tab's turn-group page size. */
		function clampReviewDoneSessions(value) {
			return Math.min(50, Math.max(1, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 30));
		}
		var SIDEBAR_PREFS_DEFAULTS;
		var init_prefs_shared = __esmMin((() => {
			SIDEBAR_PREFS_DEFAULTS = {
				openByDefault: true,
				defaultWidthPercent: 30,
				autoOpenSubagent: true,
				autoOpenJobs: true,
				agentTerminalTools: false,
				bottomPanelAutoTerminal: true,
				terminalFontFamily: "",
				terminalFontSize: 13,
				interceptOpenPath: true,
				titleBarCompat: false,
				titleBarStripPx: 40,
				htmlViewerNoSandbox: false,
				htmlViewerDefaultUnsafe: false,
				browserNoSandbox: false,
				browserInterceptLinks: true,
				browserInterceptHttp: true,
				browserInterceptHttps: false,
				centerTabOverflow: "scroll",
				centerTabMax: 20,
				reviewDoneSessionLimit: 30,
				editorMinimap: true,
				tabsEnabled: {},
				viewersEnabled: {},
				pluginSettings: {}
			};
		}));
		//#endregion
		//#region src/client/breakpoints.ts
		/**
		* Narrow-viewport ("mobile") breakpoint for the sidebar. Width-based, shared
		* by the layout logic (JS) and the style gates (CSS). The CSS side pairs
		* with this file via `@media (max-width: 767px)` rules (sidebar.module.css)
		* — 767px ≡ widths below NARROW_MAX_WIDTH, documented at both ends.
		*
		* "Real narrow" on purpose: the mobile layout (one full-screen drawer, the
		* bottom panel's tabs merged into the right sidebar) is a phone / portrait
		* tablet experience. The value is deliberately NOT aligned to the DSH app
		* shell's own 1024px breakpoint — 1024px windows (small laptops, split
		* panes) keep the desktop two-panel layout.
		*/
		/** Whether a viewport width is narrow (mobile). */
		function isNarrowWidth(width) {
			return width < 768;
		}
		/**
		* Live narrow-viewport flag for components. Reads `window.innerWidth` and
		* re-measures on resize (rAF-throttled, the repo's existing drag pattern).
		* Deliberately avoids `matchMedia` (jsdom does not implement it) — the
		* resize listener is equally exact for a breakpoint that never changes
		* while the page is open.
		*/
		function useNarrowViewport() {
			const [narrow, setNarrow] = (0, react.useState)(() => typeof window !== "undefined" && isNarrowWidth(window.innerWidth));
			(0, react.useEffect)(() => {
				if (typeof window === "undefined") return;
				let frame = null;
				const measure = () => {
					frame = null;
					setNarrow(isNarrowWidth(window.innerWidth));
				};
				const onResize = () => {
					if (frame === null) frame = requestAnimationFrame(measure);
				};
				window.addEventListener("resize", onResize);
				return () => {
					window.removeEventListener("resize", onResize);
					if (frame !== null) cancelAnimationFrame(frame);
				};
			}, []);
			return narrow;
		}
		var init_breakpoints = __esmMin((() => {}));
		//#endregion
		//#region src/client/state.ts
		/** Unique pane/tab id within one state instance. */
		function uid(prefix) {
			nextIdCounter += 1;
			return `${prefix}:${nextIdCounter}`;
		}
		/**
		* The largest numeric suffix across a raw persisted state's counter ids
		* (`pane:N` / `tab:N` / `split:N`). The uid counter is module-global and
		* resets on every reload, so a split minted AFTER a reload would collide
		* with the persisted ids (a fresh "pane:1" beside the persisted "pane:1");
		* mapLeaf would then visit BOTH leaves and every open would land in both
		* panes of the split. Seeding the counter past the persisted ids keeps
		* fresh ids disjoint.
		*/
		function maxCounterId(parsed) {
			let max = 0;
			const consider = (id) => {
				if (typeof id !== "string") return;
				const match = /^(?:pane|tab|split):(\d+)$/.exec(id);
				if (match !== null) max = Math.max(max, Number(match[1]));
			};
			const walk = (node) => {
				if (node === null || typeof node !== "object") return;
				const record = node;
				consider(record.id);
				if (Array.isArray(record.tabs)) {
					for (const tab of record.tabs) if (tab !== null && typeof tab === "object") consider(tab.id);
				}
				if (Array.isArray(record.children)) for (const child of record.children) walk(child);
			};
			walk(parsed?.splits);
			walk(parsed?.bottomSplits);
			const centerTabs = parsed?.centerTabs;
			if (Array.isArray(centerTabs)) {
				for (const tab of centerTabs) if (tab !== null && typeof tab === "object") consider(tab.id);
			}
			return max;
		}
		/** A fresh default state: one explorer tab in one pane, open per the caller's
		* preference. `width` is the caller's preferred panel width (default
		* PANEL_DEFAULT) and `panelOpen` whether the panel starts expanded (default
		* true); the store seeds new sessions from the user's side card prefs.
		* `seedExplorer` places the default explorer tab — the store passes false
		* when the user disabled the explorer tab type in settings, so a fresh
		* session starts with an empty pane instead of a tab they turned off. */
		function makeDefaultState(width = 400, panelOpen = true, seedExplorer = true) {
			const leaf = {
				kind: "leaf",
				id: uid("pane"),
				tabs: [],
				active: null
			};
			if (seedExplorer) {
				leaf.tabs = [{
					id: uid("tab"),
					type: "explorer",
					title: "Explorer"
				}];
				leaf.active = leaf.tabs[0].id;
			}
			const bottomLeaf = {
				kind: "leaf",
				id: uid("pane"),
				tabs: [],
				active: null
			};
			return {
				panelOpen,
				width,
				activePane: leaf.id,
				nextTerminal: 1,
				nextBrowser: 1,
				expanded: [],
				splits: leaf,
				bottomOpen: false,
				bottomHeight: 220,
				bottomOpenedOnce: false,
				bottomSplits: bottomLeaf,
				centerTabs: [],
				centerActive: null
			};
		}
		/** Whether a tree node (or any descendant) carries the given pane/split id. */
		function treeHasId(node, id) {
			if (node.id === id) return true;
			if (node.kind === "split") return node.children.some((child) => treeHasId(child, id));
			return false;
		}
		/** Which tree owns a pane/split id: 'bottomSplits' when the id lives in the
		*  bottom panel's tree, else 'splits' (the right panel's tree). Ids are
		*  globally unique (the shared uid counter), so an id in neither tree falls
		*  back to the right tree, where tree operations no-op on a missing node —
		*  the pre-bottom-panel behavior. */
		function treeOf(state, id) {
			return treeHasId(state.bottomSplits, id) ? "bottomSplits" : "splits";
		}
		/** Walk the tree and apply `visit` to the leaf with the given id. */
		function mapLeaf(node, paneId, visit) {
			if (node.kind === "leaf") {
				if (node.id === paneId) {
					const copy = {
						...node,
						tabs: [...node.tabs]
					};
					visit(copy);
					return copy;
				}
				return node;
			}
			const split = node;
			return {
				...split,
				sizes: [...split.sizes],
				children: split.children.map((child) => mapLeaf(child, paneId, visit))
			};
		}
		/** The first leaf of the tree (fallback pane when activePane is gone). */
		function firstLeaf(node) {
			if (node.kind === "leaf") return node;
			return firstLeaf(node.children[0]);
		}
		/** Empty every leaf of a tree (the bottom tree after its tabs migrate out). */
		function clearAllTabs(node) {
			if (node.kind === "leaf") return {
				...node,
				tabs: [],
				active: null
			};
			return {
				...node,
				children: node.children.map(clearAllTabs)
			};
		}
		/**
		* Narrow-viewport migration: the bottom panel's tabs are thrown INTO the
		* right sidebar — the "merged display" on mobile is the right panel alone,
		* whose tab strips now carry the bottom tree's tabs (depth-first order,
		* appended to the right tree's FIRST leaf). The bottom tree is emptied (its
		* structure stays — the desktop bottom panel re-renders its welcome cards)
		* and the panel closes. The active pane moves to the right tree's first
		* leaf so every new tab lands in the visible panel.
		*
		* Idempotent: a bottom tree with no tabs and a closed panel returns the
		* same reference. Runs when the viewport enters narrow (see the Sidebar
		* shell); migrating is permanent for the session — the tabs now live in the
		* right tree, exactly like the user "threw them in".
		*/
		function migrateBottomTabs(state) {
			const bottomTabs = allLeaves(state.bottomSplits).flatMap((leaf) => leaf.tabs);
			const activeInBottom = state.activePane !== null && treeHasId(state.bottomSplits, state.activePane);
			if (bottomTabs.length === 0 && !state.bottomOpen && !activeInBottom) return state;
			const target = firstLeaf(state.splits);
			return {
				...state,
				activePane: target.id,
				bottomOpen: false,
				splits: bottomTabs.length > 0 ? mapLeaf(state.splits, target.id, (leaf) => {
					leaf.tabs = [...leaf.tabs, ...bottomTabs];
				}) : state.splits,
				bottomSplits: bottomTabs.length > 0 ? clearAllTabs(state.bottomSplits) : state.bottomSplits
			};
		}
		/** Find the leaf containing a tab id, if any. */
		function leafWithTab(node, tabId) {
			if (node.kind === "leaf") return node.tabs.some((tab) => tab.id === tabId) ? node : void 0;
			for (const child of node.children) {
				const found = leafWithTab(child, tabId);
				if (found !== void 0) return found;
			}
		}
		/** All leaves of the tree, depth-first. */
		function allLeaves(node) {
			if (node.kind === "leaf") return [node];
			return node.children.flatMap(allLeaves);
		}
		/** Locate a tab in either workbench tree or the conversation-header strip. */
		function findTab(state, tabId) {
			const center = state.centerTabs.find((tab) => tab.id === tabId);
			if (center !== void 0) return center;
			for (const leaf of allLeaves(state.splits).concat(allLeaves(state.bottomSplits))) {
				const found = leaf.tabs.find((tab) => tab.id === tabId);
				if (found !== void 0) return found;
			}
		}
		/** Pane id hosting a tab, or the conversation-header strip. */
		function findPaneOfTab(state, tabId) {
			if (state.centerTabs.some((tab) => tab.id === tabId)) return CENTER_PANE_ID;
			for (const leaf of allLeaves(state.splits).concat(allLeaves(state.bottomSplits))) if (leaf.tabs.some((tab) => tab.id === tabId)) return leaf.id;
			return state.activePane ?? firstLeaf(state.splits).id;
		}
		/** Whether a tab exists anywhere in a state (either tree, any pane). */
		function tabOpenIn(state, tabId) {
			return allLeaves(state.splits).some((leaf) => leaf.tabs.some((tab) => tab.id === tabId)) || allLeaves(state.bottomSplits).some((leaf) => leaf.tabs.some((tab) => tab.id === tabId)) || state.centerTabs.some((tab) => tab.id === tabId);
		}
		/**
		* Split a leaf by inserting a fresh leaf holding `tab` beside it — the
		* VSCode drag-to-edge gesture. `dir` is the split direction ('row' for
		* left/right, 'col' for up/down); `front` places the new leaf first (left/
		* up) or second (right/down).
		* @returns the new tree plus the fresh leaf's id (the drop's active pane).
		*/
		function insertLeafAt(node, paneId, dir, tab, front) {
			const fresh = {
				kind: "leaf",
				id: uid("pane"),
				tabs: [tab],
				active: tab.id
			};
			const leafId = fresh.id;
			return {
				node: mapLeaf(node, paneId, (leaf) => {
					const target = { ...leaf };
					const split = {
						kind: "split",
						id: uid("split"),
						dir,
						sizes: [.5, .5],
						children: front ? [fresh, target] : [target, fresh]
					};
					Object.assign(leaf, split);
				}),
				leafId
			};
		}
		/**
		* The VSCode drag gesture: move a tab out of its pane and either merge it
		* into the target pane (center) or split the target pane with the tab in a
		* fresh leaf (edge). The source pane collapses when it empties.
		*
		* The panes may live in DIFFERENT trees (dragging a tab between the two
		* panels): the tab then leaves its own tree and lands in the other one.
		*/
		/**
		* Resolve a workbench drag: either pull an existing tab, or mint a seed
		* (git-history file / patch header). Same id already open is taken instead.
		*/
		function takeDraggedTab(state, fromPane, tabId, seed) {
			if (tabOpenIn(state, tabId)) return takeTab(state, findPaneOfTab(state, tabId), tabId);
			if (seed !== void 0 && seed.id === tabId) return {
				state,
				tab: seed
			};
			return takeTab(state, fromPane, tabId);
		}
		/** Land a taken tab on a pane (merge or edge-split). */
		function landTabOnPane(state, tab, toPane, zone) {
			const toKey = treeOf(state, toPane);
			if (zone === "center") return {
				...state,
				activePane: toPane,
				[toKey]: mapLeaf(state[toKey], toPane, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				})
			};
			const dir = zone === "left" || zone === "right" ? "row" : "col";
			const result = insertLeafAt(state[toKey], toPane, dir, tab, zone === "left" || zone === "up");
			return {
				...state,
				[toKey]: result.node,
				activePane: result.leafId
			};
		}
		function moveTabToEdge(state, fromPane, tabId, toPane, zone, seed) {
			if (fromPane === toPane && zone === "center" && seed === void 0) return moveTab(state, fromPane, tabId, toPane, -1);
			const taken = takeDraggedTab(state, fromPane, tabId, seed);
			if (taken === void 0) return state;
			return landTabOnPane(taken.state, taken.tab, toPane, zone);
		}
		/**
		* Remove a leaf from the tree. A split left with one child promotes that
		* child; removing the last leaf yields an empty leaf.
		*/
		function removeLeafAt(node, paneId) {
			if (node.kind === "leaf") return node.id === paneId ? {
				...node,
				tabs: [],
				active: null
			} : node;
			const children = node.children.filter((child) => !(child.kind === "leaf" && child.id === paneId));
			if (children.length === node.children.length) return {
				...node,
				sizes: [...node.sizes],
				children: node.children.map((child) => removeLeafAt(child, paneId))
			};
			if (children.length === 1) return children[0];
			return {
				...node,
				sizes: [...node.sizes],
				children
			};
		}
		/** Close a tab; an emptied leaf is removed (unless it is the only pane). */
		function closeTab(state, paneId, tabId) {
			if (paneId === "center" || state.centerTabs.some((tab) => tab.id === tabId)) {
				const next = state.centerTabs.filter((tab) => tab.id !== tabId);
				if (next.length === state.centerTabs.length) return state;
				const centerActive = state.centerActive === tabId ? next[next.length - 1]?.id ?? null : state.centerActive;
				return {
					...state,
					centerTabs: next,
					centerActive
				};
			}
			const key = treeOf(state, paneId);
			let emptied = false;
			const splits = mapLeaf(state[key], paneId, (leaf) => {
				leaf.tabs = leaf.tabs.filter((tab) => tab.id !== tabId);
				if (leaf.active === tabId) leaf.active = leaf.tabs[leaf.tabs.length - 1]?.id ?? null;
				if (leaf.tabs.length === 0) emptied = true;
			});
			return {
				...state,
				[key]: emptied ? removeLeafAt(splits, paneId) : splits
			};
		}
		/** Keep one conversation-header tab; drop the rest. */
		function closeOtherCenterTabs(state, tabId) {
			const keep = state.centerTabs.find((tab) => tab.id === tabId);
			if (keep === void 0) return state;
			if (state.centerTabs.length === 1) return {
				...state,
				centerActive: tabId
			};
			return {
				...state,
				centerTabs: [keep],
				centerActive: tabId
			};
		}
		/** Close every conversation-header tab and hide the overlay. */
		function closeAllCenterTabs(state) {
			if (state.centerTabs.length === 0 && state.centerActive === null) return state;
			return {
				...state,
				centerTabs: [],
				centerActive: null
			};
		}
		/** Activate a tab in its pane (the pane's own tree). */
		function activateTab(state, paneId, tabId) {
			if (paneId === "center") return state.centerTabs.some((tab) => tab.id === tabId) ? {
				...state,
				centerActive: tabId
			} : state;
			const key = treeOf(state, paneId);
			return {
				...state,
				activePane: paneId,
				[key]: mapLeaf(state[key], paneId, (leaf) => {
					if (leaf.tabs.some((tab) => tab.id === tabId)) leaf.active = tabId;
				})
			};
		}
		/** Update the display fields of one open tab (title / path / meta) without
		*  re-opening it. The browser tab persists its current URL and hostname
		*  title through this reducer so a reload restores the visited page. A
		*  missing tab id is a no-op. The tab may live in either tree. */
		function patchTab(state, tabId, patch) {
			let changed = false;
			const walk = (node) => {
				if (node.kind === "leaf") {
					const tabs = node.tabs.map((tab) => {
						if (tab.id !== tabId) return tab;
						changed = true;
						return {
							...tab,
							...patch.title !== void 0 ? { title: patch.title } : {},
							...patch.path !== void 0 ? { path: patch.path } : {},
							...patch.meta !== void 0 ? { meta: patch.meta } : {}
						};
					});
					return tabs === node.tabs ? node : {
						...node,
						tabs
					};
				}
				const children = node.children.map(walk);
				return children === node.children ? node : {
					...node,
					children
				};
			};
			const splits = walk(state.splits);
			const bottomSplits = walk(state.bottomSplits);
			const centerTabs = state.centerTabs.map((tab) => {
				if (tab.id !== tabId) return tab;
				changed = true;
				return {
					...tab,
					...patch.title !== void 0 ? { title: patch.title } : {},
					...patch.path !== void 0 ? { path: patch.path } : {},
					...patch.meta !== void 0 ? { meta: patch.meta } : {}
				};
			});
			return changed ? {
				...state,
				splits,
				bottomSplits,
				centerTabs
			} : state;
		}
		/**
		* Land a tab in the active pane (or focus its existing instance by id).
		* Dedup strategies (single-instance, per-path, per-change) are owned by the
		* tab descriptor through {@link BetterSidebarService.openTab} / `dedupeKey`;
		* this reducer only handles the id-based safety net (reconcile and
		* openDiffTab already check existence before calling) and the landing
		* itself — the service's dedupe path delegates here after its dedupeKey
		* check misses.
		*
		* The active pane may live in EITHER tree (pane ids are globally unique):
		* a stale id that survives in neither tree falls back to the right tree's
		* first pane instead of swallowing the open.
		*/
		function openTabInActivePane(state, tab) {
			let targetId = state.activePane ?? firstLeaf(state.splits).id;
			if (!allLeaves(state[treeOf(state, targetId)]).some((leaf) => leaf.id === targetId)) targetId = firstLeaf(state.splits).id;
			const targetKey = treeOf(state, targetId);
			if (state.centerTabs.some((candidate) => candidate.id === tab.id)) return activateTab(state, CENTER_PANE_ID, tab.id);
			for (const leaf of allLeaves(state.splits).concat(allLeaves(state.bottomSplits))) {
				const existing = leaf.tabs.find((candidate) => candidate.id === tab.id);
				if (existing !== void 0) return activateTab(state, leaf.id, existing.id);
			}
			return {
				...state,
				activePane: targetId,
				[targetKey]: mapLeaf(state[targetKey], targetId, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				})
			};
		}
		/** Move a tab from one pane to another (insert at index; -1 appends).
		*  The panes may live in DIFFERENT trees — dragging a tab between the two
		*  panels removes it from its own tree and lands it in the other one. */
		function moveTab(state, fromPane, tabId, toPane, index = -1, seed) {
			const taken = takeDraggedTab(state, fromPane, tabId, seed);
			if (taken === void 0) return state;
			const toKey = treeOf(taken.state, toPane);
			const target = mapLeaf(taken.state[toKey], toPane, (leaf) => {
				const insertAt = index >= 0 && index <= leaf.tabs.length ? index : leaf.tabs.length;
				leaf.tabs = [
					...leaf.tabs.slice(0, insertAt),
					taken.tab,
					...leaf.tabs.slice(insertAt)
				];
				leaf.active = taken.tab.id;
			});
			return {
				...taken.state,
				[toKey]: target,
				activePane: toPane
			};
		}
		/**
		* Open a diff tab the VSCode way: an existing instance of the same change is
		* focused wherever it lives; otherwise the tab joins the first pane that
		* already holds diff tabs (diff panes are sticky — repeated clicks stack
		* there); on the FIRST diff of a layout the source pane splits vertically so
		* the diff lands in a fresh pane below it ("默认在下半栏新增一个").
		*
		* This is split-tree placement surgery, not registry dispatch: the diff tab
		* descriptor's `dedupeKey` is `(tab) => tab.id`, and the existing-instance
		* check below is exactly that rule — the two agree by construction (asserted
		* in tests). Diff tabs minted by the Git view carry change-derived ids, so
		* the id check is the per-change dedupe.
		* @returns the new state, with the diff pane active.
		*/
		function openDiffTab(state, sourcePaneId, tab) {
			const existingLeaf = leafWithTab(state.splits, tab.id);
			if (existingLeaf !== void 0) return activateTab(state, existingLeaf.id, tab.id);
			const diffLeaf = allLeaves(state.splits).find((leaf) => leaf.tabs.some((candidate) => candidate.type === "diff"));
			if (diffLeaf !== void 0) return {
				...state,
				activePane: diffLeaf.id,
				splits: mapLeaf(state.splits, diffLeaf.id, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				})
			};
			if (!allLeaves(state.splits).some((leaf) => leaf.id === sourcePaneId)) return openTabInActivePane(state, tab);
			const result = insertLeafAt(state.splits, sourcePaneId, "col", tab, false);
			return {
				...state,
				splits: result.node,
				activePane: result.leafId
			};
		}
		/**
		* Open the git history log in the BOTTOM panel (same strip as the
		* terminal). An existing instance is focused; otherwise the tab joins the
		* bottom tree's first leaf and the panel expands.
		*/
		function openHistoryTab(state, tab) {
			const existing = leafWithTab(state.bottomSplits, tab.id) ?? leafWithTab(state.splits, tab.id);
			if (existing !== void 0) {
				const next = activateTab(state, existing.id, tab.id);
				return treeOf(next, existing.id) === "bottomSplits" ? {
					...next,
					bottomOpen: true
				} : next;
			}
			const leaf = firstLeaf(state.bottomSplits);
			return {
				...state,
				bottomOpen: true,
				activePane: leaf.id,
				bottomSplits: mapLeaf(state.bottomSplits, leaf.id, (node) => {
					node.tabs = [...node.tabs, tab];
					node.active = tab.id;
				})
			};
		}
		/** Toggle the panel open/closed (opening restores the previous layout). */
		function togglePanel(state) {
			return {
				...state,
				panelOpen: !state.panelOpen
			};
		}
		/** Toggle the bottom panel open/closed (independent of the right panel). */
		function toggleBottomPanel(state) {
			return {
				...state,
				bottomOpen: !state.bottomOpen
			};
		}
		/**
		* Drop a tab onto the conversation column: open the bottom panel (if
		* needed) and merge the tab into its first leaf. Used when the user
		* drags a sidebar tab onto the chat / composer strip (not the header tabs).
		*/
		function dockTabToBottom(state, fromPane, tabId, seed) {
			return {
				...moveTabToEdge(state, fromPane, tabId, firstLeaf(state.bottomSplits).id, "center", seed),
				bottomOpen: true
			};
		}
		/** Pull a tab out of either workbench tree (or the center strip). */
		function takeTab(state, fromPane, tabId) {
			const center = state.centerTabs.find((candidate) => candidate.id === tabId);
			if (center !== void 0) return {
				state: {
					...state,
					centerTabs: state.centerTabs.filter((candidate) => candidate.id !== tabId),
					centerActive: state.centerActive === tabId ? null : state.centerActive
				},
				tab: center
			};
			const key = treeOf(state, fromPane);
			const source = leafWithTab(state[key], tabId);
			if (source === void 0) return void 0;
			const tab = source.tabs.find((candidate) => candidate.id === tabId);
			if (tab === void 0) return void 0;
			let emptied = false;
			let node = mapLeaf(state[key], source.id, (leaf) => {
				leaf.tabs = leaf.tabs.filter((candidate) => candidate.id !== tabId);
				if (leaf.active === tabId) leaf.active = leaf.tabs[leaf.tabs.length - 1]?.id ?? null;
				if (leaf.tabs.length === 0) emptied = true;
			});
			if (emptied) node = removeLeafAt(node, source.id);
			return {
				state: {
					...state,
					[key]: node
				},
				tab
			};
		}
		/**
		* Dock a workbench tab onto the conversation header (对话 / 轨迹 strip).
		* The tab leaves its pane and becomes a `conversation.view` entry.
		*/
		function dockTabToCenter(state, fromPane, tabId, seed, overflow, max) {
			if (state.centerTabs.some((tab) => tab.id === tabId)) return {
				...state,
				centerActive: tabId
			};
			const taken = takeDraggedTab(state, fromPane, tabId, seed);
			if (taken === void 0) return state;
			const next = {
				...taken.state,
				centerTabs: [...taken.state.centerTabs, taken.tab],
				centerActive: taken.tab.id
			};
			return overflow === void 0 || max === void 0 ? next : trimCenterTabs(next, overflow, max);
		}
		/**
		* Wrap-mode overflow: keep the newest `max` conversation-header tabs and
		* drop the oldest. Scroll mode never trims.
		*/
		function trimCenterTabs(state, overflow, max) {
			if (overflow !== "wrap") return state;
			const cap = Math.max(1, Math.round(max));
			if (state.centerTabs.length <= cap) return state;
			const drop = state.centerTabs.length - cap;
			const next = state.centerTabs.slice(drop);
			const centerActive = state.centerActive !== null && next.some((tab) => tab.id === state.centerActive) ? state.centerActive : next[next.length - 1]?.id ?? null;
			return {
				...state,
				centerTabs: next,
				centerActive
			};
		}
		/**
		* Promote a conversation-header preview (SCM / git-history diff) into a
		* workspace file editor sitting in the same header slot. An already-open
		* editor of that path is focused (and docked to the header if it lived in
		* a workbench pane); otherwise `editor` is seeded in place of `fromId`.
		*/
		function promoteCenterTabToEditor(state, fromId, editor) {
			if (state.centerTabs.some((tab) => tab.id === fromId) === false) return state;
			if (fromId === editor.id && editor.type === "editor") return {
				...state,
				centerActive: editor.id
			};
			let next = {
				...state,
				centerTabs: state.centerTabs.filter((tab) => tab.id !== fromId),
				centerActive: state.centerActive === fromId ? null : state.centerActive
			};
			if (tabOpenIn(next, editor.id)) return dockTabToCenter(next, findPaneOfTab(next, editor.id), editor.id);
			return dockTabToCenter(next, "seed", editor.id, editor);
		}
		/** Set the panel width (clamped to the contract range; the upper bound is
		* the viewport so the fullscreen expansion can fill the window). */
		function setWidth(state, width) {
			const max = typeof window !== "undefined" ? Math.max(280, window.innerWidth) : 640;
			return {
				...state,
				width: Math.min(max, Math.max(280, Math.round(width)))
			};
		}
		/** Set the bottom panel height (clamped to the contract range). The upper
		* bound leaves the center column (the agent output area) at least PANEL_MIN
		* tall — without the cap the bottom panel could swallow the whole viewport
		* and squeeze the conversation to zero height. */
		function setBottomHeight(state, height) {
			const viewport = typeof window !== "undefined" ? window.innerHeight : Infinity;
			const max = Math.max(120, viewport - 280);
			return {
				...state,
				bottomHeight: Math.min(max, Math.max(120, Math.round(height)))
			};
		}
		/** Toggle a directory in the explorer expansion set. */
		function toggleExpanded(state, path) {
			const expanded = state.expanded.includes(path) ? state.expanded.filter((item) => item !== path) : [...state.expanded, path];
			return {
				...state,
				expanded
			};
		}
		/** Adjust one split divider: `i` is the left/top child index, delta in fractions. */
		function resizeSplit(node, splitId, index, delta) {
			if (node.kind === "leaf") return node;
			if (node.id === splitId) {
				const sizes = [...node.sizes];
				const left = Math.min(.92, Math.max(.08, sizes[index] + delta));
				const right = Math.min(.92, Math.max(.08, sizes[index + 1] - delta));
				sizes[index] = left;
				sizes[index + 1] = right;
				return {
					...node,
					sizes
				};
			}
			return {
				...node,
				sizes: [...node.sizes],
				children: node.children.map((child) => resizeSplit(child, splitId, index, delta))
			};
		}
		/** State-level {@link resizeSplit} route: the divider may live in either
		*  tree (split ids are globally unique). */
		function resizeSplitIn(state, splitId, index, delta) {
			const key = treeOf(state, splitId);
			return {
				...state,
				[key]: resizeSplit(state[key], splitId, index, delta)
			};
		}
		/** Whether a tab id refers to an agent-owned terminal. */
		function isAgentTabId(tabId) {
			return tabId.startsWith(AGENT_TAB_PREFIX);
		}
		/** Extract the agent terminal uuid from an `agent:<uuid>` tab id. */
		function agentUuidOf(tabId) {
			return tabId.slice(6);
		}
		/** Build the sidebar tab id for one agent terminal uuid. */
		function agentTabId(uuid) {
			return `${AGENT_TAB_PREFIX}${uuid}`;
		}
		/**
		* Reconcile the sidebar's agent-terminal tabs with the host's live list.
		* The host pushes the current list of agent terminals (created by the model
		* through the `terminal_create` tool) over a dedicated WebSocket; this
		* reducer mirrors that list into tabs: new uuids get a tab, vanished uuids
		* lose theirs. The agent owns the lifetime — the user closing a tab sends a
		* WS close frame that kills the pty, which fires a change, which converges
		* the view. Idempotent: a no-op when the lists already match.
		* @param state - the current per-session sidebar state.
		* @param agentTerminals - the live agent terminal snapshots from the host.
		* @returns the next state (or the same reference if no change was needed).
		*/
		function reconcileAgentTerminals(state, agentTerminals) {
			const existingAgentTabs = allLeaves(state.splits).concat(allLeaves(state.bottomSplits)).flatMap((leaf) => leaf.tabs).concat(state.centerTabs).filter((tab) => isAgentTabId(tab.id));
			const existingUuids = new Set(existingAgentTabs.map((tab) => agentUuidOf(tab.id)));
			const serverUuids = new Set(agentTerminals.map((t) => t.uuid));
			const toAdd = agentTerminals.filter((t) => !existingUuids.has(t.uuid));
			const toRemove = existingAgentTabs.filter((tab) => !serverUuids.has(agentUuidOf(tab.id)));
			if (toAdd.length === 0 && toRemove.length === 0) return state;
			let next = state;
			for (const tab of toRemove) next = closeTab(next, findPaneOfTab(next, tab.id), tab.id);
			for (const terminal of toAdd) {
				const tab = {
					id: agentTabId(terminal.uuid),
					type: "terminal",
					title: terminal.title
				};
				next = openTabInActivePane(next, tab);
			}
			return next;
		}
		/** Default panel width for one viewport: the prefs percent of the window,
		* clamped to the panel floor (a tiny percent must stay usable) and to the
		* viewport (a large one must never cover the whole window). */
		function defaultWidthFor(viewport, percent) {
			return Math.min(viewport, Math.max(280, Math.round(viewport * percent / 100)));
		}
		function loadState(sessionId, prefs) {
			try {
				const raw = localStorage.getItem(`${STORAGE_PREFIX}:${sessionId}`);
				if (raw !== null) {
					const parsed = JSON.parse(raw);
					nextIdCounter = maxCounterId(parsed);
					const sanitized = sanitizeState(parsed);
					if (sanitized !== void 0) return sanitized;
				}
			} catch {}
			const viewport = typeof window !== "undefined" ? window.innerWidth : void 0;
			return makeDefaultState(viewport === void 0 ? 400 : defaultWidthFor(viewport, prefs.defaultWidthPercent), prefs.openByDefault && (viewport === void 0 || !isNarrowWidth(viewport)), prefs.tabsEnabled["explorer"] !== false);
		}
		/**
		* Structural validation of one persisted state. A malformed or stale shape
		* (older layouts, hand-edited storage) must fall back to the default instead
		* of crashing the panel on every reload; the restored width is also clamped
		* to the current viewport so a stale fullscreen width can never crush the
		* app shell (margin-right larger than the window) or cover the whole screen.
		* @returns a clean state, or undefined to fall back to the default.
		*/
		function sanitizeState(parsed) {
			if (parsed === null || typeof parsed !== "object") return void 0;
			const record = parsed;
			if (typeof record.panelOpen !== "boolean") return void 0;
			if (typeof record.width !== "number" || !Number.isFinite(record.width)) return void 0;
			if (typeof record.nextTerminal !== "number" || !Number.isInteger(record.nextTerminal) || record.nextTerminal < 1) return;
			const nextBrowser = typeof record.nextBrowser === "number" && Number.isInteger(record.nextBrowser) && record.nextBrowser >= 1 ? record.nextBrowser : 1;
			if (typeof record.activePane !== "string" && record.activePane !== null) return void 0;
			if (!Array.isArray(record.expanded) || record.expanded.some((item) => typeof item !== "string")) return void 0;
			const seen = /* @__PURE__ */ new Set();
			const reid = /* @__PURE__ */ new Map();
			const splits = sanitizeNode(record.splits, seen, reid);
			if (splits === void 0) return void 0;
			const bottomOpen = record.bottomOpen === true;
			const maxHeight = typeof window !== "undefined" ? window.innerHeight : Infinity;
			const bottomCap = Math.max(120, maxHeight - 280);
			const rawHeight = typeof record.bottomHeight === "number" && Number.isFinite(record.bottomHeight) ? record.bottomHeight : 220;
			const bottomHeight = Math.min(bottomCap, Math.max(120, Math.round(rawHeight)));
			const bottomSplits = sanitizeNode(record.bottomSplits, seen, reid) ?? {
				kind: "leaf",
				id: uid("pane"),
				tabs: [],
				active: null
			};
			const centerTabs = sanitizeTabList(record.centerTabs);
			const maxWidth = typeof window !== "undefined" ? window.innerWidth : Infinity;
			return {
				panelOpen: record.panelOpen,
				width: Math.max(280, Math.min(record.width, maxWidth)),
				activePane: typeof record.activePane === "string" ? reid.get(record.activePane) ?? record.activePane : null,
				nextTerminal: record.nextTerminal,
				nextBrowser,
				expanded: record.expanded,
				splits,
				bottomOpen,
				bottomHeight,
				bottomOpenedOnce: record.bottomOpenedOnce === true,
				bottomSplits,
				centerTabs,
				centerActive: typeof record.centerActive === "string" && centerTabs.some((tab) => tab.id === record.centerActive) ? record.centerActive : centerTabs[centerTabs.length - 1]?.id ?? null
			};
		}
		/**
		* One tree node id, deduplicated against the ids already seen in this
		* state. Duplicates are exactly the pre-seeding counter-reset corruption
		* (a "pane:1"/"split:1" minted after a reload beside the persisted ones):
		* keeping both would make mapLeaf visit two leaves at once and every open
		* would land in both panes, so the repeat gets a fresh id.
		* @returns the id to use (the original, or a fresh uid for repeats).
		*/
		function uniqueNodeId(id, seen, reid) {
			if (!seen.has(id)) {
				seen.add(id);
				return id;
			}
			const fresh = uid(/^split:\d+$/.test(id) ? "split" : "pane");
			seen.add(fresh);
			reid.set(id, fresh);
			return fresh;
		}
		/** Validate a flat tab list (conversation-header docks). Malformed entries drop the list. */
		function sanitizeTabList(value) {
			if (!Array.isArray(value)) return [];
			const tabs = [];
			const seen = /* @__PURE__ */ new Set();
			for (const tab of value) {
				if (tab === null || typeof tab !== "object") continue;
				const candidate = tab;
				if (typeof candidate.id !== "string" || typeof candidate.title !== "string") continue;
				if (typeof candidate.type !== "string" || candidate.type === "diff") continue;
				if (seen.has(candidate.id)) continue;
				seen.add(candidate.id);
				tabs.push({
					id: candidate.id,
					type: candidate.type,
					title: candidate.title,
					...typeof candidate.path === "string" ? { path: candidate.path } : {},
					...candidate.meta !== void 0 ? { meta: candidate.meta } : {}
				});
			}
			return tabs;
		}
		/** Validate one split-tree node (leaf or split) and rebuild it cleanly. */
		function sanitizeNode(node, seen, reid) {
			if (node === null || typeof node !== "object") return void 0;
			const record = node;
			if (record.kind === "leaf") {
				if (typeof record.id !== "string" || !Array.isArray(record.tabs)) return void 0;
				const tabs = [];
				let droppedDiff = false;
				for (const tab of record.tabs) {
					if (tab === null || typeof tab !== "object") return void 0;
					const candidate = tab;
					if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return void 0;
					if (candidate.type === "diff") {
						droppedDiff = true;
						continue;
					}
					if (typeof candidate.type !== "string") return void 0;
					tabs.push({
						id: candidate.id,
						type: candidate.type,
						title: candidate.title,
						...typeof candidate.path === "string" ? { path: candidate.path } : {},
						...candidate.meta !== void 0 ? { meta: candidate.meta } : {}
					});
				}
				const active = typeof record.active === "string" ? record.active : null;
				if (active !== null && !tabs.some((tab) => tab.id === active) && !droppedDiff) return void 0;
				return {
					kind: "leaf",
					id: uniqueNodeId(record.id, seen, reid),
					tabs,
					active: active !== null && tabs.some((tab) => tab.id === active) ? active : null
				};
			}
			if (record.kind === "split") {
				if (typeof record.id !== "string" || record.dir !== "row" && record.dir !== "col") return void 0;
				if (!Array.isArray(record.children) || !Array.isArray(record.sizes)) return void 0;
				const children = [];
				for (const child of record.children) {
					const clean = sanitizeNode(child, seen, reid);
					if (clean === void 0) return void 0;
					children.push(clean);
				}
				if (children.length < 2) return void 0;
				if (record.sizes.length !== children.length || record.sizes.some((size) => typeof size !== "number" || !Number.isFinite(size) || size <= 0)) return;
				return {
					kind: "split",
					id: uniqueNodeId(record.id, seen, reid),
					dir: record.dir,
					sizes: record.sizes,
					children
				};
			}
		}
		/**
		* Create one sidebar store instance. Production code calls this only from
		* the client plugin's `apply` (the instance is handed to components as a
		* prop); tests call it directly. No module-level singleton: the store's
		* lifetime belongs to the plugin activation, exactly like the official
		* `createXXXStore()` factory rule.
		*/
		function createSidebarStore() {
			return new SidebarStore();
		}
		var CENTER_PANE_ID, nextIdCounter, AGENT_TAB_PREFIX, STORAGE_PREFIX, SidebarStore;
		var init_state = __esmMin((() => {
			init_prefs_shared();
			init_breakpoints();
			CENTER_PANE_ID = "center";
			nextIdCounter = 0;
			AGENT_TAB_PREFIX = "agent:";
			STORAGE_PREFIX = "dsh-sidebar:v1";
			SidebarStore = class {
				bySession = /* @__PURE__ */ new Map();
				snapshot = {
					sessionId: void 0,
					state: void 0,
					prefs: { ...SIDEBAR_PREFS_DEFAULTS }
				};
				listeners = /* @__PURE__ */ new Set();
				/** Per-session persist debounce timers (v0.12.0+: one per session, so a
				*  targeted open never cancels another session's pending write). */
				persistTimers = /* @__PURE__ */ new Map();
				/** User-facing side card prefs seeding brand-new session states (defaults until the settings RPC resolves). */
				prefs = { ...SIDEBAR_PREFS_DEFAULTS };
				constructor() {
					this.subscribe = this.subscribe.bind(this);
					this.getSnapshot = this.getSnapshot.bind(this);
					this.getPrefs = this.getPrefs.bind(this);
				}
				/**
				* Replace the side card prefs (the settings RPC result / settings page
				* write). Notifies like any store change: the snapshot carries the prefs,
				* so consumers that gate on enable switches (the + menu, derived flows)
				* re-render with the new values immediately.
				*/
				setPrefs(prefs) {
					this.prefs = { ...prefs };
					this.snapshot = {
						...this.snapshot,
						prefs: this.prefs
					};
					this.notify();
				}
				/** The current side card prefs (seeds new sessions; persisted states win). */
				getPrefs() {
					return this.prefs;
				}
				/** Select a session (or none); loads its persisted state. */
				setSession(sessionId) {
					if (this.snapshot.sessionId === sessionId) return;
					if (sessionId === void 0) this.snapshot = {
						sessionId: void 0,
						state: void 0,
						prefs: this.prefs
					};
					else {
						let state = this.bySession.get(sessionId);
						if (state === void 0) {
							state = loadState(sessionId, this.prefs);
							this.bySession.set(sessionId, state);
						} else nextIdCounter = maxCounterId(state);
						this.snapshot = {
							sessionId,
							state,
							prefs: this.prefs
						};
					}
					this.notify();
				}
				subscribe(listener) {
					this.listeners.add(listener);
					return () => {
						this.listeners.delete(listener);
					};
				}
				getSnapshot() {
					return this.snapshot;
				}
				/** Mutate the current session's state (no-op without a session). */
				update(mutator) {
					const sessionId = this.snapshot.sessionId;
					const state = this.snapshot.state;
					if (sessionId === void 0 || state === void 0) return;
					const draft = structuredClone(state);
					mutator(draft);
					this.bySession.set(sessionId, draft);
					this.snapshot = {
						sessionId,
						state: draft,
						prefs: this.prefs
					};
					this.schedulePersist(sessionId, draft);
					this.notify();
				}
				/**
				* Whether a tab still exists in its session's state. Views use this on
				* unmount to tell "the tab was closed" (release the terminal now) from
				* "the tree re-rendered / the conversation switched" (the tab is still
				* open — keep the terminal alive through the host's reconnect grace).
				* Checks the session's own map entry (the current snapshot may already
				* point at another session when a conversation switch unmounts the old
				* one's tabs).
				*/
				tabOpen(sessionId, tabId) {
					const state = this.bySession.get(sessionId) ?? (this.snapshot.sessionId === sessionId ? this.snapshot.state : void 0);
					return state !== void 0 && tabOpenIn(state, tabId);
				}
				/** Apply a pure reducer (returns the next state). */
				reduce(reducer) {
					const sessionId = this.snapshot.sessionId;
					const state = this.snapshot.state;
					if (sessionId === void 0 || state === void 0) return;
					const next = reducer(state);
					if (next === state) return;
					this.bySession.set(sessionId, next);
					this.snapshot = {
						sessionId,
						state: next,
						prefs: this.prefs
					};
					this.schedulePersist(sessionId, next);
					this.notify();
				}
				/**
				* Apply a pure reducer to a TARGET session's state (not the active one),
				* loading it on demand and persisting the result — WITHOUT switching the
				* active snapshot or notifying (the UI must not follow along). Used by the
				* service's targeted `openTab(seed, scope)`: the open lands in the target
				* session's layout and is visible whenever the user switches to it.
				*/
				reduceFor(sessionId, reducer) {
					const counterBefore = nextIdCounter;
					let state = this.bySession.get(sessionId);
					if (state === void 0) {
						state = loadState(sessionId, this.prefs);
						this.bySession.set(sessionId, state);
					} else nextIdCounter = maxCounterId(state);
					const next = reducer(state);
					nextIdCounter = Math.max(nextIdCounter, counterBefore);
					if (next === state) return;
					this.bySession.set(sessionId, next);
					this.schedulePersist(sessionId, next);
				}
				schedulePersist(sessionId, state) {
					const existing = this.persistTimers.get(sessionId);
					if (existing !== void 0) window.clearTimeout(existing);
					const timer = window.setTimeout(() => {
						this.persistTimers.delete(sessionId);
						try {
							localStorage.setItem(`${STORAGE_PREFIX}:${sessionId}`, JSON.stringify(state));
						} catch {}
					}, 200);
					this.persistTimers.set(sessionId, timer);
				}
				notify() {
					for (const listener of [...this.listeners]) listener();
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		var init_clsx = __esmMin((() => {}));
		//#endregion
		//#region src/client/locales.ts
		/**
		* Attach (or detach, with undefined) the DSH locale service. The sidebar
		* mounts its own React root outside the slot system's locale seat, so the
		* service rides this module-level holder: components keep calling the plain
		* `t()` function, and the Sidebar root's locale subscription re-renders the
		* whole tree on switches.
		*/
		function attachLocale(service) {
			localeService = service;
		}
		/**
		* The active locale id ('zh' | 'en'): the DSH locale service's snapshot when
		* attached, else the browser language.
		*/
		function activeLocale() {
			return localeService?.getSnapshot().active ?? (typeof navigator !== "undefined" ? navigator.language : "") ?? "en";
		}
		/** Translate a copy key; `{name}` placeholders interpolate from `params`. */
		function t(key, params) {
			let text = (activeLocale().toLowerCase().startsWith("zh") ? zh : en)[key];
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		/** Format an ISO 8601 author date relative to now (刚刚 / N 分钟前 / N 小时前 / 昨天 / date). */
		function relativeTime(iso) {
			const then = Date.parse(iso);
			if (Number.isNaN(then)) return iso;
			const seconds = Math.floor((Date.now() - then) / 1e3);
			if (seconds < 60) return t("timeJustNow");
			if (seconds < 3600) return t("timeMinutesAgo", { n: Math.floor(seconds / 60) });
			if (seconds < 86400) return t("timeHoursAgo", { n: Math.floor(seconds / 3600) });
			if (seconds < 172800) return t("timeYesterday");
			const date = new Date(then);
			const pad = (value) => String(value).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		var zh, en, LOCALE_NS, localeService;
		var init_locales = __esmMin((() => {
			zh = {
				explorer: "资源管理器",
				findFile: "搜索文件",
				findFilePlaceholder: "按文件名模糊搜索",
				findFileEmpty: "没有匹配的文件",
				git: "源代码管理",
				review: "改动审查",
				terminal: "终端",
				editor: "编辑器",
				openExplorer: "资源管理器",
				openGit: "Git 面板",
				newTerminal: "新终端",
				terminalLimit: "终端数量已达上限 (3)",
				close: "关闭",
				closeOthers: "关闭其他",
				closeAll: "关闭全部",
				collapse: "折叠侧边栏",
				expand: "展开侧边栏",
				collapseBottomPanel: "折叠底部面板",
				expandBottomPanel: "展开底部面板",
				dropToBottom: "放到底部面板",
				dropToConversation: "放到对话栏",
				conversationTab: "对话",
				returnToSidebar: "移回侧栏",
				terminalError: "终端连接失败",
				terminalConnectFailed: "终端多次连接失败",
				terminalRetry: "重试",
				preview: "预览",
				edit: "编辑",
				refresh: "刷新",
				save: "保存",
				saved: "已保存",
				unsaved: "未保存",
				saveFailed: "保存失败",
				truncation: "文件过大，仅显示前 512KB",
				binary: "二进制文件，无法预览",
				loading: "加载中…",
				error: "加载失败",
				retry: "重试",
				splitLeft: "向左分栏",
				splitRight: "向右分栏",
				splitUp: "向上分栏",
				splitDown: "向下分栏",
				notRepo: "当前目录不是 git 仓库",
				noChanges: "没有变更",
				stage: "暂存",
				unstage: "取消暂存",
				stageAll: "全部暂存",
				unstageAll: "全部取消暂存",
				commitPlaceholder: "提交信息 (Ctrl+Enter)",
				commit: "提交",
				commitError: "提交失败",
				branch: "分支",
				checkoutError: "切换分支失败",
				history: "历史",
				historyOpen: "在底部打开",
				historyPick: "选择一条提交查看变更",
				historyNoFiles: "这次提交没有文件变更",
				historySubject: "说明",
				historyAuthor: "作者",
				historyDate: "日期",
				changes: "变更",
				staged: "已暂存",
				modified: "已修改",
				untracked: "未跟踪",
				addAll: "全部添加",
				gitRepo: "仓库",
				groupBy: "分组",
				groupByNone: "不分组",
				groupByDirectory: "按目录",
				groupByModule: "按模块",
				groupRoot: "仓库根目录",
				cancel: "取消",
				diffEmpty: "没有文本差异",
				diffLoadError: "加载差异失败",
				diffBinary: "二进制",
				diffAdded: "新增",
				diffDeleted: "删除",
				diffRenamed: "重命名",
				diffExpand: "展开其余 {count} 行",
				diffCollapse: "收起",
				discard: "放弃更改",
				discardTitle: "放弃更改",
				discardDesc: "将丢弃「{path}」的工作区修改（不可恢复）。",
				viewCommitDiff: "查看提交差异",
				copyShortHash: "复制短哈希",
				copyFullHash: "复制完整哈希",
				copySubject: "复制提交信息",
				revertCommit: "还原此提交",
				revertTitle: "还原此提交",
				revertDesc: "将在当前分支创建一个反转「{subject}」的新提交。",
				cherryPickCommit: "捡取此提交",
				cherryPickTitle: "捡取此提交",
				cherryPickDesc: "将「{subject}」的更改应用到当前分支。",
				timeJustNow: "刚刚",
				timeMinutesAgo: "{n} 分钟前",
				timeHoursAgo: "{n} 小时前",
				timeYesterday: "昨天",
				loadMore: "加载更多",
				historyLoadError: "加载更多历史失败",
				produced: "本次产出",
				producedOpen: "在侧边栏中打开",
				reviewPending: "{count} 处待处理",
				reviewKeep: "接受",
				reviewUndo: "撤销",
				reviewKeepHunk: "接受 {range}",
				reviewUndoHunk: "撤销 {range}",
				reviewKeepAll: "全部接受",
				reviewUndoAll: "全部撤销",
				reviewKept: "已接受",
				reviewUndone: "已撤销",
				reviewEmpty: "这个会话还没有改过文件",
				reviewCaughtUp: "待处理的改动都已处理完",
				reviewFilterPending: "待处理",
				reviewFilterAll: "全部",
				reviewFilterDone: "已处理",
				reviewDoneSessionsTitle: "改动审查每页轮次数",
				reviewDoneSessionsDesc: "当前会话「全部 / 已处理」先展示最近多少轮（对应「第 n 轮」，1–50，默认 30）。滑到底部继续加载更早的轮次和改过的文件。待处理始终全量。不展示其它会话。",
				reviewSessionFiles: "{count} 个已处理文件",
				reviewAdded: "新增",
				reviewEdited: "修改",
				reviewDeleted: "删除",
				reviewBarHint: "智能体改过这个文件",
				reviewTurn: "第 {n} 轮",
				reviewTurnUnknown: "未编号轮次",
				reviewNoPrompt: "（无用户消息）",
				reviewFileCount: "{count} 个文件",
				disconnected: "终端连接断开，重连中…",
				exited: "终端进程已退出",
				noSession: "选择一个会话以使用侧边栏",
				pluginNotLoaded: "插件未加载，标签页暂不可用：",
				hiddenFiles: "隐藏文件",
				parent: "上级目录",
				copied: "已复制",
				copy: "复制",
				newFile: "新文件",
				openEditor: "打开编辑器",
				gitDetail: "查看变更详情",
				referenceFile: "@文件",
				addToConversation: "添加到对话",
				copyRelative: "复制相对地址",
				copyAbsolute: "复制绝对地址",
				download: "下载",
				settingsNav: "侧边卡片",
				settingsIntro: "管理侧边卡片的显示内容与默认行为",
				settingsPopupDesc: "为「{feature}」配置相关选项",
				settingsDone: "完成",
				settingsOpenTitle: "新会话默认打开",
				settingsOpenDesc: "新建会话时自动展开侧边卡片；已存在的会话保持各自布局",
				settingsWidthTitle: "默认宽度占比",
				settingsWidthDesc: "新建会话时侧边卡片占窗口宽度的百分比 (20–60)",
				settingsWidthSuffix: "%",
				settingsOpenPathTitle: "聊天区文件在侧边栏打开",
				settingsOpenPathDesc: "在聊天里点击文件链接（工具行、产物列表、文件提及）时，在侧边栏编辑器中打开，不再调用系统默认应用",
				settingsTitleBarTitle: "位置兼容模式",
				settingsTitleBarDesc: "为 Windows 右上角的原生标题栏预留空间：侧边栏按钮与侧边栏内容整体下移，避免被标题栏遮挡",
				settingsTitleBarStripTitle: "下移距离",
				settingsTitleBarStripDesc: "标题栏条带高度：侧边栏按钮与内容下移的像素数（0–120，默认 40）",
				settingsCenterTabsTitle: "对话栏文件标签",
				settingsCenterTabsDesc: "文件停到「对话 / 轨迹」旁时，标签放不下怎么排",
				settingsCenterTabsScroll: "单行滑动",
				settingsCenterTabsScrollDesc: "和右侧工作区一样，超出后左右滑动",
				settingsCenterTabsWrap: "换行展示",
				settingsCenterTabsWrapDesc: "像 IDEA 一样换行；超过上限时关掉最早打开的标签",
				settingsCenterTabMaxTitle: "最多标签数",
				settingsCenterTabMaxDesc: "换行模式下打开新标签时，超过这个数就关掉最早的（1–100，默认 20）",
				settingsSaveFailed: "保存失败",
				settingsConflict: "设置已被其他窗口修改，请重试",
				binaryNoPreview: "此文件类型不支持预览",
				downloadToView: "下载查看",
				settingsSubagentTitle: "检测到子代理时自动展开任务管理页",
				settingsSubagentDesc: "当前会话产生新的子代理时，自动展开侧边栏并打开任务管理页；关闭后需手动打开",
				settingsJobsTitle: "有新后台任务时自动展开后台任务页",
				settingsJobsDesc: "当前会话出现新的后台任务时，自动展开侧边栏并打开后台任务页（每个新任务都会触发）；关闭后需手动打开",
				settingsToolsTitle: "为模型注入终端工具",
				settingsToolsDesc: "开启后，模型可通过 terminal_create 等 8 个工具创建并操作侧边栏终端（默认关闭）",
				settingsBottomTerminalTitle: "底部面板首次展开自动开终端",
				settingsBottomTerminalDesc: "每次会话中第一次展开底部面板时，尝试在底部面板自动打开一个新终端标签（终端数量上限仍会限制；默认开启）",
				settingsFontFamilyTitle: "终端字体",
				settingsFontFamilyDesc: "自定义终端字体族（CSS font-family，如 \"JetBrains Mono\", monospace；留空跟随主题等宽字体）",
				settingsFontFamilyPlaceholder: "\"JetBrains Mono\", monospace",
				settingsFontSizeTitle: "终端字号",
				settingsFontSizeDesc: "终端字号（9–32，默认 13）",
				settingsFontSizeSuffix: "px",
				settingsTabsTitle: "侧边栏内容",
				settingsViewersTitle: "文件预览",
				settingsGeneralTitle: "常规",
				settingsPopup: "功能设置",
				settingsViewerCatchAll: "兜底：任意文件",
				viewerImage: "图片",
				viewerPdf: "PDF",
				viewerMarkdown: "Markdown",
				viewerCode: "代码",
				settingsEditorMinimapTitle: "显示代码小地图",
				settingsEditorMinimapDesc: "在文件预览右侧显示 VS Code 风格缩略图，点击可跳转；代码 / Markdown / HTML 源码共用。关闭后编辑器与现在一样",
				viewerBinary: "二进制下载",
				viewerHtml: "HTML",
				browser: "浏览器",
				browserPlaceholder: "输入网址，例如 example.com",
				browserGo: "前往",
				browserBack: "后退",
				browserForward: "前进",
				browserStart: "输入网址开始浏览（沙箱模式）",
				browserBlockedScheme: "已阻止：仅支持 http/https 链接",
				browserBlockedLoopback: "已阻止：不允许在浏览器中访问本机或内部地址",
				browserInvalid: "无效的网址",
				browserNoSandboxWarning: "沙箱已关闭：当前页面与界面同源，拥有完整会话权限（可在设置中恢复）",
				htmlNoSandboxWarning: "沙箱已关闭：此 HTML 与界面同源，可读取会话文件与内部接口（可在设置中恢复）",
				sandboxStatusOn: "沙箱模式：已启用 · 页面无法访问界面数据与本地文件，登录态与第三方 Cookie 可能不可用",
				sandboxUnlock: "临时解锁（不安全）",
				sandboxRestore: "恢复沙箱",
				settingsHtmlDefaultUnsafeTitle: "HTML 预览默认以非沙箱模式打开（不安全）",
				settingsHtmlDefaultUnsafeDesc: "开启后，每次打开 HTML 文件时预览默认处于非沙箱状态（与界面同源，可读取会话文件与内部接口）；可在状态行临时恢复沙箱",
				settingsHtmlSandboxTitle: "关闭 HTML 预览沙箱（不安全）",
				settingsHtmlSandboxDesc: "关闭后，预览的 HTML 将与界面同源运行，可读取会话文件、本地存储并调用内部接口。仅对完全可信的文件开启",
				settingsBrowserSandboxTitle: "关闭浏览器沙箱（不安全）",
				settingsBrowserSandboxDesc: "关闭后，访问的任何网站都将与界面同源运行，可读取会话数据并冒充你的登录状态。仅对完全可信的站点开启",
				settingsBrowserLinksTitle: "聊天区外链在侧边栏打开",
				settingsBrowserLinksDesc: "开启后，点击聊天或界面中的外链时在侧边栏打开，不再弹出新窗口；HTTP 与 HTTPS 可分别通过下方开关控制；Ctrl/Cmd 点击可临时放行",
				settingsBrowserHttpTitle: "侧边打开HTTP网页",
				settingsBrowserHttpDesc: "开启后，点击聊天或界面中的 HTTP 外链时在侧边栏打开（声明了 urlTarget 的插件页面优先）；Ctrl/Cmd 点击可临时放行",
				settingsBrowserHttpsTitle: "侧边打开HTTPS网页",
				settingsBrowserHttpsDesc: "开启后，点击聊天或界面中的 HTTPS 外链时在侧边栏打开。默认关闭：多数 HTTPS 站点拒绝被嵌入，走系统浏览器更顺畅",
				browserOpenExternal: "在浏览器中打开",
				browserEmbedBlocked: "{host} 拒绝了嵌入请求",
				browserEmbedBlockedDesc: "该站点通过 X-Frame-Options / frame-ancestors 禁止在其它页面中显示，无法在侧边栏内加载。可在浏览器中直接打开",
				browserEmbedAnyway: "仍然加载",
				subagent: "任务管理",
				openSubagent: "任务管理",
				subagentMainAgent: "主代理",
				subagentEmpty: "暂无子代理",
				subagentEmptyDesc: "当前主代理派生的子代理将显示在这里",
				subagentRunning: "运行中",
				subagentInactive: "空闲",
				subagentModeOneShot: "一次性",
				subagentModeContinuable: "可续接",
				subagentCount: "{count} 个子代理",
				subagentCountRunning: "{count} 个子代理 · {running} 运行中",
				subagentDiagCorrupt: "目录损坏",
				subagentDiagUnsupported: "不支持的条目",
				subagentDiagUnavailable: "不可用",
				subagentThinking: "思考中…",
				jobs: "后台任务",
				jobsCount: "{count} 个后台任务",
				jobsCountRunning: "{count} 个后台任务 · {running} 运行中",
				jobStatusRunning: "运行中",
				jobStatusStopping: "终止中",
				jobStatusCompleted: "已完成",
				jobStatusKilled: "已终止",
				jobStatusFailed: "失败",
				jobDurationSeconds: "{seconds} 秒",
				jobDurationMinutes: "{minutes} 分 {seconds} 秒",
				jobDurationHours: "{hours} 小时 {minutes} 分",
				jobViewOutput: "查看输出",
				jobHideOutput: "收起输出",
				jobNoOutput: "暂无输出",
				jobNotReadYet: "等待模型读取该任务的输出（模型执行 job_output 后，输出会显示在这里）",
				jobOutputTruncated: "输出过长，已截断显示",
				jobOutputError: "输出读取失败",
				jobKill: "终止",
				jobKillConfirm: "再次点击确认终止",
				jobKillError: "终止失败",
				addPluginsTabCard: "添加 Tab 插件",
				addPluginsTabCardDesc: "注册新的侧边栏页面",
				addPluginsViewerCard: "添加预览插件",
				addPluginsViewerCardDesc: "注册新的文件类型预览",
				addPluginsTabDesc: "侧边栏页面（Tab）可以由插件扩展。插件通过 ctx.betterSidebar 服务注册；点击「安装」复制安装命令，粘贴到 DSH 所在环境的终端执行。",
				addPluginsViewerDesc: "文件预览器可以由插件扩展。插件通过 ctx.betterSidebar 服务注册；点击「安装」复制安装命令，粘贴到 DSH 所在环境的终端执行。",
				addPluginsBrowseMore: "在 GitHub 上浏览更多插件（topic: dsh-better-sidebar）",
				addPluginsRecommended: "推荐插件",
				addPluginsEmpty: "暂未收录插件，欢迎在 GitHub topic 下发布你的插件",
				openPlugin: "跳转",
				copyInstall: "复制安装命令",
				pluginOfficeDesc: "为 better-sidebar 编辑器提供 Office 三件套预览（.docx / .xlsx / .pptx），把重型 Office 渲染库拆出主包、按需安装",
				pluginSentinelDesc: "条件驱动的 agent 唤醒系统：文件/进程/端口/HTTP/命令/webhook 传感器，条件达成自动唤醒休眠会话；注册「哨兵」Tab 展示服务器全局监控表",
				pluginSidebarQaDesc: "基于 better-sidebar 的划选提问tab分页: 对话划选 → 右侧面板提问 → 同工作区独立追问会话（❓追问·主题）：快速无思考模型压缩主对话上下文后与引文一起注入，不打断主对话；追问可嵌套、可继续、可归档"
			};
			en = {
				explorer: "Explorer",
				findFile: "Find file",
				findFilePlaceholder: "Fuzzy search by file name",
				findFileEmpty: "No matching files",
				git: "Source Control",
				review: "Review",
				terminal: "Terminal",
				editor: "Editor",
				openExplorer: "Explorer",
				openGit: "Git panel",
				newTerminal: "New terminal",
				terminalLimit: "Terminal limit reached (3)",
				close: "Close",
				closeOthers: "Close others",
				closeAll: "Close all",
				collapse: "Collapse sidebar",
				expand: "Expand sidebar",
				collapseBottomPanel: "Collapse bottom panel",
				expandBottomPanel: "Expand bottom panel",
				dropToBottom: "Drop on bottom panel",
				dropToConversation: "Drop on conversation tabs",
				conversationTab: "Chat",
				returnToSidebar: "Return to sidebar",
				terminalError: "Terminal connection failed",
				terminalConnectFailed: "Terminal failed to connect repeatedly",
				terminalRetry: "Retry",
				preview: "Preview",
				edit: "Edit",
				refresh: "Refresh",
				save: "Save",
				saved: "Saved",
				unsaved: "Unsaved",
				saveFailed: "Save failed",
				truncation: "File too large — showing the first 512KB",
				binary: "Binary file, preview unavailable",
				loading: "Loading…",
				error: "Failed to load",
				retry: "Retry",
				splitLeft: "Split left",
				splitRight: "Split right",
				splitUp: "Split up",
				splitDown: "Split down",
				notRepo: "This directory is not a git repository",
				noChanges: "No changes",
				stage: "Stage",
				unstage: "Unstage",
				stageAll: "Stage all",
				unstageAll: "Unstage all",
				commitPlaceholder: "Commit message (Ctrl+Enter)",
				commit: "Commit",
				commitError: "Commit failed",
				branch: "Branch",
				checkoutError: "Branch switch failed",
				history: "History",
				historyOpen: "Open in bottom panel",
				historyPick: "Select a commit to inspect its changes",
				historyNoFiles: "This commit has no file changes",
				historySubject: "Message",
				historyAuthor: "Author",
				historyDate: "Date",
				changes: "Changes",
				staged: "Staged",
				modified: "Modified",
				untracked: "Untracked",
				addAll: "Add all",
				gitRepo: "Repository",
				groupBy: "Group by",
				groupByNone: "None",
				groupByDirectory: "Directory",
				groupByModule: "Module",
				groupRoot: "Repository root",
				cancel: "Cancel",
				diffEmpty: "No text changes",
				diffLoadError: "Failed to load diff",
				diffBinary: "Binary",
				diffAdded: "Added",
				diffDeleted: "Deleted",
				diffRenamed: "Renamed",
				diffExpand: "Expand {count} more rows",
				diffCollapse: "Collapse",
				discard: "Discard changes",
				discardTitle: "Discard changes",
				discardDesc: "This discards the worktree changes of \"{path}\" (not recoverable).",
				viewCommitDiff: "View commit diff",
				copyShortHash: "Copy short hash",
				copyFullHash: "Copy full hash",
				copySubject: "Copy subject",
				revertCommit: "Revert commit",
				revertTitle: "Revert commit",
				revertDesc: "Create a new commit on the current branch that reverts \"{subject}\".",
				cherryPickCommit: "Cherry-pick commit",
				cherryPickTitle: "Cherry-pick commit",
				cherryPickDesc: "Apply the changes of \"{subject}\" to the current branch.",
				timeJustNow: "just now",
				timeMinutesAgo: "{n} min ago",
				timeHoursAgo: "{n} h ago",
				timeYesterday: "yesterday",
				loadMore: "Load more",
				historyLoadError: "Failed to load more history",
				produced: "Produced",
				producedOpen: "Open in sidebar",
				reviewPending: "{count} pending",
				reviewKeep: "Keep",
				reviewUndo: "Undo",
				reviewKeepHunk: "Keep {range}",
				reviewUndoHunk: "Undo {range}",
				reviewKeepAll: "Keep all",
				reviewUndoAll: "Undo all",
				reviewKept: "Kept",
				reviewUndone: "Undone",
				reviewEmpty: "This conversation has not changed any files",
				reviewCaughtUp: "Nothing left to review",
				reviewFilterPending: "Pending",
				reviewFilterAll: "All",
				reviewFilterDone: "Reviewed",
				reviewDoneSessionsTitle: "Review turns per page",
				reviewDoneSessionsDesc: "How many recent Keep / Undo turns (the “Turn N” groups) to list first under All / Reviewed in this conversation (1–50, default 30). Scroll to load older turns and file writes. Pending is never capped. Other conversations are not listed.",
				reviewSessionFiles: "{count} reviewed files",
				reviewAdded: "Added",
				reviewEdited: "Edited",
				reviewDeleted: "Deleted",
				reviewBarHint: "The agent edited this file",
				reviewTurn: "Turn {n}",
				reviewTurnUnknown: "Unnumbered turn",
				reviewNoPrompt: "(no user message)",
				reviewFileCount: "{count} files",
				disconnected: "Terminal disconnected, reconnecting…",
				exited: "Terminal process exited",
				noSession: "Select a conversation to use the sidebar",
				pluginNotLoaded: "Plugin not loaded; tab unavailable:",
				hiddenFiles: "Hidden files",
				parent: "Parent directory",
				copied: "Copied",
				copy: "Copy",
				newFile: "New file",
				openEditor: "Open editor",
				gitDetail: "View change details",
				referenceFile: "@file",
				addToConversation: "Add to conversation",
				copyRelative: "Copy relative path",
				copyAbsolute: "Copy absolute path",
				download: "Download",
				settingsNav: "Side card",
				settingsIntro: "Manage what the side card shows and how it behaves",
				settingsPopupDesc: "Configure related options for {feature}",
				settingsDone: "Done",
				settingsOpenTitle: "Open by default for new conversations",
				settingsOpenDesc: "Expand the side card automatically for brand-new conversations; existing conversations keep their own layouts",
				settingsWidthTitle: "Default width share",
				settingsWidthDesc: "The side card's default share of the window width for new conversations (20–60)",
				settingsWidthSuffix: "%",
				settingsOpenPathTitle: "Open chat files in the sidebar",
				settingsOpenPathDesc: "Open file links in the chat (tool rows, produced files, mentions) in the sidebar editor instead of the system default app",
				settingsTitleBarTitle: "Position compatibility mode",
				settingsTitleBarDesc: "Reserve space for the native Windows title bar at the top-right so the sidebar buttons and content sit below it instead of underneath",
				settingsTitleBarStripTitle: "Shift distance",
				settingsTitleBarStripDesc: "Title-bar strip height: how far the sidebar buttons and content move down in px (0–120, default 40)",
				settingsCenterTabsTitle: "Conversation-header file tabs",
				settingsCenterTabsDesc: "How file tabs next to Chat / Trajectory behave when they no longer fit",
				settingsCenterTabsScroll: "Single-row scroll",
				settingsCenterTabsScrollDesc: "Same as the right workbench: slide sideways when they overflow",
				settingsCenterTabsWrap: "Wrap like IDEA",
				settingsCenterTabsWrapDesc: "Wrap onto extra rows; opening past the cap closes the oldest tab",
				settingsCenterTabMaxTitle: "Maximum tabs",
				settingsCenterTabMaxDesc: "In wrap mode, opening one more tab past this number closes the oldest (1–100, default 20)",
				settingsSaveFailed: "Failed to save",
				settingsConflict: "The setting changed in another window — please retry",
				binaryNoPreview: "This file type cannot be previewed",
				downloadToView: "Download to view",
				settingsSubagentTitle: "Auto-open the Tasks page when a subagent appears",
				settingsSubagentDesc: "Expand the side card and open the Tasks page when the current conversation spawns a new subagent; turn off to open it manually",
				settingsJobsTitle: "Auto-open the Jobs page on a new background job",
				settingsJobsDesc: "Expand the side card and open the Jobs page whenever a new background job appears for the current conversation (every new job triggers); turn off to open it manually",
				settingsToolsTitle: "Inject terminal tools for the model",
				settingsToolsDesc: "When enabled, the model can create and drive sidebar terminals through the 8 terminal_* tools (off by default)",
				settingsBottomTerminalTitle: "Auto-open a terminal on the bottom panel's first expansion",
				settingsBottomTerminalDesc: "When the bottom panel is expanded for the first time in a session, try to open a fresh terminal tab there (the terminal quota still applies; on by default)",
				settingsFontFamilyTitle: "Terminal font family",
				settingsFontFamilyDesc: "Custom terminal font family (a CSS font-family stack like \"JetBrains Mono\", monospace; leave empty to follow the theme's monospace font)",
				settingsFontFamilyPlaceholder: "\"JetBrains Mono\", monospace",
				settingsFontSizeTitle: "Terminal font size",
				settingsFontSizeDesc: "Terminal font size in px (9–32, default 13)",
				settingsFontSizeSuffix: "px",
				settingsTabsTitle: "Sidebar content",
				settingsViewersTitle: "File viewers",
				settingsGeneralTitle: "General",
				settingsPopup: "Feature settings",
				settingsViewerCatchAll: "Catch-all: any file",
				viewerImage: "Image",
				viewerPdf: "PDF",
				viewerMarkdown: "Markdown",
				viewerCode: "Code",
				settingsEditorMinimapTitle: "Show code minimap",
				settingsEditorMinimapDesc: "Show a VS Code-style thumbnail on the right of file previews; click to jump. Shared by code, Markdown, and HTML source. Turn off to keep the editor as it is today",
				viewerBinary: "Binary download",
				viewerHtml: "HTML",
				browser: "Browser",
				browserPlaceholder: "Enter a URL, e.g. example.com",
				browserGo: "Go",
				browserBack: "Back",
				browserForward: "Forward",
				browserStart: "Enter a URL to start browsing (sandbox mode)",
				browserBlockedScheme: "Blocked: only http/https URLs are allowed",
				browserBlockedLoopback: "Blocked: local and internal addresses cannot be browsed here",
				browserInvalid: "Invalid URL",
				browserNoSandboxWarning: "Sandbox off: the current page runs with full GUI privileges (re-enable in settings)",
				htmlNoSandboxWarning: "Sandbox off: this HTML runs with full GUI privileges (re-enable in settings)",
				sandboxStatusOn: "Sandbox mode: on · pages cannot access the GUI's data or local files; logins and third-party cookies may not work",
				sandboxUnlock: "Temporarily disable (unsafe)",
				sandboxRestore: "Restore sandbox",
				settingsHtmlDefaultUnsafeTitle: "Open HTML previews unsandboxed by default (unsafe)",
				settingsHtmlDefaultUnsafeDesc: "When on, every newly opened HTML preview starts in the unsandboxed state (same origin as the GUI — it can read session files and internal APIs); the status row still offers a one-tap restore",
				settingsHtmlSandboxTitle: "Disable HTML preview sandbox (unsafe)",
				settingsHtmlSandboxDesc: "With the sandbox off, previewed HTML runs with the same origin as the GUI: it can read session files, local storage and call internal APIs. Only enable for fully trusted files",
				settingsBrowserSandboxTitle: "Disable browser sandbox (unsafe)",
				settingsBrowserSandboxDesc: "With the sandbox off, any visited site runs with the same origin as the GUI: it can read session data and act as your logged-in session. Only enable for fully trusted sites",
				settingsBrowserLinksTitle: "Open chat external links in the sidebar",
				settingsBrowserLinksDesc: "When on, clicking an external link in the chat or GUI opens the sidebar instead of a new window; HTTP and HTTPS are controlled separately by the switches below; Ctrl/Cmd+click always bypasses",
				settingsBrowserHttpTitle: "Open HTTP pages in the sidebar",
				settingsBrowserHttpDesc: "When on, clicking an HTTP external link in the chat or GUI opens the sidebar (plugin pages declaring urlTarget win); Ctrl/Cmd+click always bypasses",
				settingsBrowserHttpsTitle: "Open HTTPS pages in the sidebar",
				settingsBrowserHttpsDesc: "When on, clicking an HTTPS external link in the chat or GUI opens the sidebar. Off by default: most HTTPS sites refuse to be embedded, so the system browser is the smoother default",
				browserOpenExternal: "Open in browser",
				browserEmbedBlocked: "{host} refused to be embedded",
				browserEmbedBlockedDesc: "The site forbids being displayed inside other pages (X-Frame-Options / frame-ancestors), so it cannot load in the sidebar. Open it directly in your browser instead.",
				browserEmbedAnyway: "Load anyway",
				subagent: "Tasks",
				openSubagent: "Tasks",
				subagentMainAgent: "Main agent",
				subagentEmpty: "No subagents",
				subagentEmptyDesc: "Subagents spawned under the main agent will appear here",
				subagentRunning: "Running",
				subagentInactive: "Inactive",
				subagentModeOneShot: "One-shot",
				subagentModeContinuable: "Continuable",
				subagentCount: "{count} subagents",
				subagentCountRunning: "{count} subagents · {running} running",
				subagentDiagCorrupt: "Corrupt",
				subagentDiagUnsupported: "Unsupported",
				subagentDiagUnavailable: "Unavailable",
				subagentThinking: "Thinking…",
				jobs: "Background jobs",
				jobsCount: "{count} background jobs",
				jobsCountRunning: "{count} background jobs · {running} running",
				jobStatusRunning: "Running",
				jobStatusStopping: "Stopping",
				jobStatusCompleted: "Completed",
				jobStatusKilled: "Killed",
				jobStatusFailed: "Failed",
				jobDurationSeconds: "{seconds}s",
				jobDurationMinutes: "{minutes}m {seconds}s",
				jobDurationHours: "{hours}h {minutes}m",
				jobViewOutput: "View output",
				jobHideOutput: "Hide output",
				jobNoOutput: "No output yet",
				jobNotReadYet: "Waiting for the model to read this job; its output appears here once the model runs job_output",
				jobOutputTruncated: "Output truncated",
				jobOutputError: "Failed to read output",
				jobKill: "Kill",
				jobKillConfirm: "Click again to confirm kill",
				jobKillError: "Kill failed",
				addPluginsTabCard: "Add tab plugins",
				addPluginsTabCardDesc: "Register a new sidebar page",
				addPluginsViewerCard: "Add preview plugins",
				addPluginsViewerCardDesc: "Register a file-type preview",
				addPluginsTabDesc: "Sidebar pages (tabs) can be extended by plugins. Plugins register through the ctx.betterSidebar service; clicking Install copies the install command — paste it into a terminal where your DSH profile lives and run it.",
				addPluginsViewerDesc: "File previewers can be extended by plugins. Plugins register through the ctx.betterSidebar service; clicking Install copies the install command — paste it into a terminal where your DSH profile lives and run it.",
				addPluginsBrowseMore: "Browse more plugins on GitHub (topic: dsh-better-sidebar)",
				addPluginsRecommended: "Recommended plugins",
				addPluginsEmpty: "No plugins curated yet — publish yours under the GitHub topic",
				openPlugin: "Open",
				copyInstall: "Copy install command",
				pluginOfficeDesc: "Office-suite preview (.docx / .xlsx / .pptx) for the better-sidebar editor, keeping the heavy Office render libraries out of the core bundle",
				pluginSentinelDesc: "Condition-driven agent wakeup: file/process/port/http/command/webhook sensors wake dormant sessions when conditions fire; registers a \"Sentinel\" tab with the server-wide watch table",
				pluginSidebarQaDesc: "Select-and-ask: Select conversation text → ask in the right-side panel → a dedicated follow-up session (❓追问) in the same workspace; a fast no-thinking model compresses the main context and injects it with the quote, without interrupting the main conversation. Follow-ups nest, continue, and archive"
			};
			LOCALE_NS = "betterSidebar";
		}));
		//#endregion
		//#region \0dsh-css:/Users/laiweibin/work/workSoftware/dhs-plugins/dsh-better-sidebar/src/client/sidebar.module.css.mjs
		var css$3, tagId$3, sidebar_module_css_default;
		var init_sidebar_module_css = __esmMin((() => {
			css$3 = ".X5YCQG_panel{z-index:40;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1);transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), width var(--ds-transition-duration-slow) var(--ds-ease-in-out);flex-direction:column;display:flex;position:fixed;top:0;bottom:0;right:0}.X5YCQG_panelHidden{pointer-events:none;visibility:hidden}.X5YCQG_panelHidden .X5YCQG_activityBar{visibility:visible;pointer-events:auto}.X5YCQG_panel[data-dragging]{transition:none}.X5YCQG_panelResize{cursor:col-resize;z-index:2;touch-action:none;width:8px;position:absolute;top:0;bottom:0;left:-4px}.X5YCQG_panelResizeActive{background:var(--dsw-alias-interactive-bg-hover-accent)}.X5YCQG_panelBody{flex:1;min-width:0;min-height:0;display:flex}.X5YCQG_bottomPanel{z-index:40;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l2);transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), height var(--ds-transition-duration-slow) var(--ds-ease-in-out);flex-direction:column;display:flex;position:fixed;bottom:0}.X5YCQG_bottomPanelHidden{pointer-events:none;visibility:hidden;transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), height var(--ds-transition-duration-slow) var(--ds-ease-in-out), visibility 0s linear var(--ds-transition-duration-slow);transform:translateY(102%)}.X5YCQG_bottomPanel[data-dragging]{transition:none}.X5YCQG_bottomResize{cursor:row-resize;z-index:2;touch-action:none;height:8px;position:absolute;top:-4px;left:0;right:0}.X5YCQG_bottomResizeActive{background:var(--dsw-alias-interactive-bg-hover-accent)}.X5YCQG_bottomClose{z-index:4;width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:absolute;top:3px;right:6px}.X5YCQG_bottomClose:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_bottomPanel .X5YCQG_tabBar{padding-right:40px}body[data-dsh-title-bar-compat] .X5YCQG_panel{padding-top:var(--dsh-title-bar-strip,40px)}.X5YCQG_cornerHandle{left:-6px;bottom:calc(var(--dsh-sidebar-height,0px) + 6px);z-index:2;cursor:nwse-resize;touch-action:none;width:12px;height:12px;position:absolute}.X5YCQG_cornerHandle:hover,.X5YCQG_cornerHandle[data-dragging]{background:var(--dsw-alias-interactive-bg-hover-accent)}.X5YCQG_iconButton{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.X5YCQG_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_iconButton:disabled{opacity:.4;cursor:default}.X5YCQG_workbench{flex:1;min-width:0;min-height:0;display:flex}.X5YCQG_activityBar{width:var(--dsh-sidebar-rail-width,44px);background:var(--dsw-alias-bg-layer-1);border-right:1px solid var(--dsw-alias-border-l1);flex-direction:column;flex:none;align-items:center;gap:4px;padding:8px 0;display:flex;overflow:hidden auto}.X5YCQG_activityBarRight{border-right:none;border-left:1px solid var(--dsw-alias-border-l1)}.X5YCQG_activityItem{width:36px;height:36px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:6px;outline:none;flex:none;justify-content:center;align-items:center;display:inline-flex;position:relative}.X5YCQG_activityItem:hover,.X5YCQG_activityItem:focus-visible{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_activityItem[aria-disabled=true]{opacity:.4;cursor:default}.X5YCQG_activityActive,.X5YCQG_activityActive:hover,.X5YCQG_activityActive:focus-visible{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}.X5YCQG_activityActive:before{content:\"\";background:var(--dsw-alias-brand-primary);border-radius:1px;width:2px;position:absolute;top:8px;bottom:8px;left:-4px}.X5YCQG_activityBadge{min-width:14px;height:14px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary);pointer-events:none;border-radius:7px;justify-content:center;align-items:center;padding:0 3px;display:inline-flex;position:absolute;bottom:1px;right:1px}.X5YCQG_split{flex:1;min-width:0;min-height:0;display:flex}.X5YCQG_splitRow{flex-direction:row}.X5YCQG_splitCol{flex-direction:column}.X5YCQG_splitChild{display:flex;position:relative;overflow:hidden}.X5YCQG_divider{z-index:3;touch-action:none;flex:none;position:relative}.X5YCQG_dividerRow:after,.X5YCQG_dividerCol:after{content:\"\";background:var(--dsw-alias-border-l2);transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out);position:absolute}.X5YCQG_dividerRow{cursor:col-resize;width:7px;margin:0 -2px}.X5YCQG_dividerRow:after{width:1px;top:0;bottom:0;left:50%;transform:translate(-50%)}.X5YCQG_dividerCol{cursor:row-resize;height:7px;margin:-2px 0}.X5YCQG_dividerCol:after{height:1px;top:50%;left:0;right:0;transform:translateY(-50%)}.X5YCQG_divider:hover:after,.X5YCQG_dividerActive:after{background:var(--dsw-alias-interactive-bg-hover-accent)}.X5YCQG_pane{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;position:relative}.X5YCQG_paneDrop{outline:1px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}.X5YCQG_dropOverlay{z-index:6;pointer-events:none;background:var(--dsw-alias-interactive-bg-hover-accent);opacity:.5;position:absolute}.X5YCQG_dropLeft{width:25%;top:0;bottom:0;left:0}.X5YCQG_dropRight{width:25%;top:0;bottom:0;right:0}.X5YCQG_dropUp{height:25%;top:0;left:0;right:0}.X5YCQG_dropDown{height:25%;bottom:0;left:0;right:0}.X5YCQG_headerStripDrop{z-index:47;box-sizing:border-box;pointer-events:none;border:2px dashed var(--dsw-alias-interactive-bg-hover-accent);background:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover-accent) 18%, transparent);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);border-radius:8px;justify-content:center;align-items:center;display:none;position:fixed}body[data-dsh-tab-dragging] .X5YCQG_headerStripDrop{pointer-events:auto;display:flex}.X5YCQG_conversationDrop{z-index:46;box-sizing:border-box;pointer-events:none;border:2px dashed var(--dsw-alias-interactive-bg-hover-accent);background:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover-accent) 18%, transparent);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);border-radius:8px;justify-content:center;align-items:center;display:none;position:fixed}body[data-dsh-tab-dragging] .X5YCQG_conversationDrop{pointer-events:auto;display:flex}.X5YCQG_conversationDropActive{background:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover-accent) 32%, transparent)}.X5YCQG_headerDrop{border:1px dashed var(--dsw-alias-interactive-bg-hover-accent);min-width:72px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);pointer-events:none;border-radius:6px;flex:auto;justify-content:center;align-self:stretch;align-items:center;margin:2px 8px 2px 4px;display:none}body[data-dsh-tab-dragging] .X5YCQG_headerDrop{pointer-events:auto;display:flex}.X5YCQG_headerDropActive{background:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover-accent) 28%, transparent);color:var(--dsw-alias-label-primary)}.X5YCQG_centerView{background:var(--dsw-alias-bg-layer-1);flex-direction:column;flex:1 0 auto;height:min(640px,100vh - 240px);min-height:min(640px,100vh - 240px);display:flex;overflow:hidden}.X5YCQG_centerViewBar{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;justify-content:flex-end;align-items:center;gap:8px;padding:4px 8px;display:flex}.X5YCQG_centerViewAction{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);cursor:pointer;background:0 0;border:none;border-radius:4px;padding:2px 6px}.X5YCQG_centerViewAction:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_centerPreview{z-index:39;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;min-height:0;display:flex;position:fixed;overflow:hidden}[data-dsh-center-tab]{border-radius:6px 6px 0 0;align-items:flex-start;gap:6px;padding-left:2px;padding-right:2px;display:inline-flex}[data-dsh-center-tab]:hover{background:var(--dsw-alias-interactive-bg-hover)}[data-dsh-center-label]{line-height:16px}.X5YCQG_centerTabClose{color:inherit;cursor:pointer;box-sizing:border-box;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-self:flex-start;align-items:center;width:16px;height:16px;margin:0;padding:0;font-size:14px;font-weight:400;line-height:16px;display:inline-flex}.X5YCQG_centerTabClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_centerPreviewTabs{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);scrollbar-width:none;flex:none;align-items:stretch;height:34px;display:flex;overflow-x:auto}.X5YCQG_centerPreviewTabs::-webkit-scrollbar{display:none}.X5YCQG_centerPreviewTab{min-width:40px;max-width:200px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);border-right:1px solid var(--dsw-alias-border-l1);cursor:pointer;user-select:none;flex:none;align-items:center;gap:4px;padding:0 4px 0 10px;display:inline-flex}.X5YCQG_centerPreviewTab:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_centerPreviewTabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_centerPreviewLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.X5YCQG_centerPreviewClose{color:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;font-size:14px;line-height:16px;display:inline-flex}.X5YCQG_centerPreviewClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_centerPreviewBody{flex-direction:column;flex:1;min-height:0;display:flex;overflow:hidden}.X5YCQG_centerPreview .X5YCQG_editorPathHeader,.X5YCQG_centerView .X5YCQG_editorPathHeader{display:none}.X5YCQG_dropCenter{outline:2px dashed var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-2px;background:0 0;inset:25%}.X5YCQG_paneContent{flex-direction:column;flex:1;min-height:0;display:flex;overflow:hidden}.X5YCQG_paneTab{flex-direction:column;flex:1;min-height:0;display:flex}.X5YCQG_paneTabHidden{display:none}.X5YCQG_paneEmptyCards{flex:1;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-content:start;gap:8px;min-height:0;padding:12px;display:grid;overflow:hidden}.X5YCQG_paneCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-strong-12);cursor:pointer;text-align:center;border-radius:8px;flex-direction:column;justify-content:center;align-items:center;gap:6px;padding:12px 8px;display:flex}.X5YCQG_paneCard:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}.X5YCQG_paneCard:disabled{opacity:.45;cursor:default}.X5YCQG_tabBar{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex:none;align-items:stretch;height:34px;display:flex}.X5YCQG_tabBarDrop{outline:1px dashed var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}.X5YCQG_tabList{scrollbar-width:none;flex:1;min-width:0;display:flex;overflow-x:auto}.X5YCQG_tabList::-webkit-scrollbar{display:none}.X5YCQG_tab{min-width:64px;max-width:160px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);border-right:1px solid var(--dsw-alias-border-l1);cursor:pointer;user-select:none;background:0 0;flex:none;align-items:center;gap:4px;padding:0 4px 0 10px;display:flex}.X5YCQG_tab:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_tabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_tabTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.X5YCQG_tabBadge{min-width:16px;height:15px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary);border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0 4px;display:inline-flex}.X5YCQG_tabClose{width:18px;height:18px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.X5YCQG_tabClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_explorer{flex-direction:column;flex:1;min-height:0;display:flex}.X5YCQG_explorerHeader{flex:none;justify-content:space-between;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.X5YCQG_explorerRoot{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_explorerFind{flex:none;padding:0 8px 8px}.X5YCQG_explorerFindInput{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:100%;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:8px;padding:0 8px}.X5YCQG_explorerFindInput::placeholder{color:var(--dsw-alias-label-tertiary)}.X5YCQG_explorerFindInput:focus{border-color:var(--dsw-alias-border-l2);outline:none}.X5YCQG_explorerFindList{flex-direction:column;display:flex}.X5YCQG_explorerFindRow{gap:6px}.X5YCQG_explorerFindName{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:55%;overflow:hidden}.X5YCQG_explorerFindLocation{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);flex:1;overflow:hidden}.X5YCQG_explorerFindModule{text-overflow:ellipsis;white-space:nowrap;max-width:28%;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);flex:none;overflow:hidden}.X5YCQG_explorerFindMark{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);padding:0;font-weight:600}.X5YCQG_explorerBody{flex:1;min-height:0;padding:2px 6px 8px;overflow-y:auto}.X5YCQG_explorerRow{width:100%;height:34px;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;white-space:nowrap;animation:X5YCQG_dsh-row-in .15s var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px;align-items:center;gap:6px;padding:0 8px;display:flex}.X5YCQG_explorerRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_explorerDir{font:var(--dsw-font-s-strong-14)}.X5YCQG_explorerHidden{opacity:.45}.X5YCQG_explorerName{text-overflow:ellipsis;overflow:hidden}.X5YCQG_explorerRef{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);height:20px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;border-radius:999px;flex:none;align-items:center;padding:0 8px;display:none}.X5YCQG_explorerRef:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_explorerRow:hover .X5YCQG_explorerRef,.X5YCQG_explorerRow:focus-within .X5YCQG_explorerRef{display:inline-flex}.X5YCQG_explorerCopied{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.X5YCQG_explorerError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);cursor:default}@keyframes X5YCQG_dsh-row-in{0%{opacity:0}}.X5YCQG_explorerEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;padding:16px}.X5YCQG_editor{flex-direction:column;flex:1;min-height:0;display:flex}.X5YCQG_editorHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:6px;padding:4px 8px;display:flex}.X5YCQG_editorTitle{min-width:0;font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.X5YCQG_editorStatus{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.X5YCQG_editorStatusError{color:var(--dsw-alias-state-error-primary)}.X5YCQG_dirtyDot{background:var(--dsw-alias-state-warn-primary);border-radius:50%;flex:none;width:7px;height:7px}.X5YCQG_editorPlaceholder{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;flex:1;justify-content:center;align-items:center;padding:16px;display:flex}.X5YCQG_orphanedType{opacity:.7;overflow-wrap:anywhere;margin-top:8px;font-size:12px;display:block}.X5YCQG_editorBinary{text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:12px;padding:24px 16px;display:flex}.X5YCQG_editorBinaryNotice{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.X5YCQG_editorDownloadLink{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-strong-12);cursor:pointer;transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out), border-color var(--ds-transition-duration-slow) var(--ds-ease-in-out);border-radius:6px;align-items:center;gap:6px;padding:6px 14px;text-decoration:none;display:inline-flex}.X5YCQG_editorDownloadLink:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}.X5YCQG_editorError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);padding:12px 16px}.X5YCQG_editorBanner{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex:none;padding:4px 12px}.X5YCQG_sandboxStatus{font:var(--dsw-font-xxxs-11);flex:none;align-items:center;gap:8px;padding:4px 10px;display:flex}.X5YCQG_sandboxStatusOn{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}.X5YCQG_sandboxStatusOff{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}.X5YCQG_sandboxDot{background:var(--dsw-alias-state-success-primary);border-radius:50%;flex:none;width:6px;height:6px}.X5YCQG_sandboxStatusOff .X5YCQG_sandboxDot{background:var(--dsw-alias-state-error-primary)}.X5YCQG_sandboxStatusText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.X5YCQG_sandboxAction{border:1px solid var(--dsw-alias-border-l2);font:inherit;color:inherit;cursor:pointer;background:0 0;border-radius:6px;flex:none;padding:2px 8px}.X5YCQG_sandboxAction:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_editorHtml{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.X5YCQG_reviewRoot{flex-direction:column;flex:1;min-height:0;display:flex;overflow:hidden}.X5YCQG_reviewToolbar,.X5YCQG_reviewFilter,.X5YCQG_reviewBar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:6px;padding:8px 10px;display:flex}.X5YCQG_reviewCount{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-secondary)}.X5YCQG_reviewToolbarGrow,.X5YCQG_reviewBarGrow{flex:1}.X5YCQG_reviewGhost,.X5YCQG_reviewFilterBtn,.X5YCQG_reviewFilterActive{border:1px solid var(--dsw-alias-border-l1);height:24px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border-radius:6px;padding:0 8px}.X5YCQG_reviewFilterActive,.X5YCQG_reviewGhost:hover,.X5YCQG_reviewFilterBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_reviewEmpty,.X5YCQG_reviewError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);flex:none;padding:16px 12px}.X5YCQG_reviewError{color:var(--dsw-alias-state-error-primary)}.X5YCQG_reviewSession{flex-direction:column;display:flex}.X5YCQG_reviewSessionHeader{align-items:baseline;gap:8px;padding:10px 12px 4px;display:flex}.X5YCQG_reviewSessionTitle{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary)}.X5YCQG_reviewSessionTime{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.X5YCQG_reviewList{flex:1;min-height:0;overflow:auto}.X5YCQG_reviewGroup{border-top:1px solid var(--dsw-alias-border-l1)}.X5YCQG_reviewGroup:first-child{border-top:none}.X5YCQG_reviewGroupHeader{flex-direction:column;gap:2px;padding:8px 12px 4px;display:flex}.X5YCQG_reviewGroupMeta{align-items:baseline;gap:8px;display:flex}.X5YCQG_reviewGroupTurn{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);text-transform:uppercase}.X5YCQG_reviewGroupCount{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.X5YCQG_reviewGroupPrompt{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_reviewRow{border-radius:8px;align-items:center;gap:8px;margin:0 6px;padding:4px 8px;display:flex}.X5YCQG_reviewRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_reviewMain{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:8px;min-width:0;padding:3px 0;display:flex}.X5YCQG_reviewName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-strong-12);flex:1;overflow:hidden}.X5YCQG_reviewKind{width:20px;height:16px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);border-radius:4px;flex:none;justify-content:center;align-items:center;display:inline-flex}.X5YCQG_reviewPrompt{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_reviewPath{max-width:42%;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:none;overflow:hidden}.X5YCQG_reviewActions{flex:none;align-items:center;gap:6px;display:flex}.X5YCQG_reviewKeep,.X5YCQG_reviewUndo{height:24px;font:var(--dsw-font-xxxs-strong-11);cursor:pointer;border:none;border-radius:6px;padding:0 10px}.X5YCQG_reviewKeep{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted)}.X5YCQG_reviewUndo{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_reviewKeep:disabled,.X5YCQG_reviewUndo:disabled,.X5YCQG_reviewGhost:disabled{opacity:.45;cursor:default}.X5YCQG_reviewDone{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.X5YCQG_reviewLoadMore{border:1px solid var(--dsw-alias-border-l1);width:calc(100% - 16px);height:28px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border-radius:6px;margin:8px;display:block}.X5YCQG_reviewLoadMore:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_reviewLoadMore:disabled{opacity:.45;cursor:default}.X5YCQG_reviewBarLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}.X5YCQG_reviewBarError{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-error-primary)}.X5YCQG_browser{flex-direction:column;flex:1;min-height:0;display:flex}.X5YCQG_browserBar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:4px;padding:6px 8px;display:flex}.X5YCQG_browserInput{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:1;padding:0 10px}.X5YCQG_browserInput:focus{border-color:var(--dsw-alias-border-l2);outline:none}.X5YCQG_browserMessage{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex:none;padding:4px 12px}.X5YCQG_browserFrame{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.X5YCQG_browserStart{text-align:center;min-height:0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);flex:1;justify-content:center;align-items:center;padding:20px;display:flex}.X5YCQG_browserBlocked{text-align:center;min-height:0;color:var(--dsw-alias-state-warn-primary);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;padding:24px;display:flex}.X5YCQG_browserBlockedTitle{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary)}.X5YCQG_browserBlockedDesc{max-width:280px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary)}.X5YCQG_browserBlockedActions{gap:8px;margin-top:6px;display:flex}.X5YCQG_browserBlockedButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11);cursor:pointer;border-radius:6px;padding:4px 12px}.X5YCQG_browserBlockedButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_editorCm{background:0 0;flex:1;min-height:0;position:relative;overflow:hidden}.X5YCQG_reviewHunkBar{right:calc(10px + var(--dsh-editor-minimap,0px));z-index:6;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);white-space:nowrap;border-radius:8px;align-items:center;gap:6px;padding:3px 6px;display:flex;position:absolute}.X5YCQG_reviewHunkError{text-overflow:ellipsis;white-space:nowrap;max-width:180px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-error-primary);overflow:hidden}.X5YCQG_editorCmHidden{display:none}.X5YCQG_editorCm .cm-editor{height:100%}.X5YCQG_editorCm .cm-editor.cm-focused{outline:none}.X5YCQG_editorCm .dsh-reveal-line{background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)}.X5YCQG_editorCm .dsh-reveal-mark{background:color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);border-radius:2px}.X5YCQG_editorModeToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;flex:none;align-items:center;gap:2px;padding:2px;display:inline-flex}.X5YCQG_editorModeButton{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border:none;border-radius:4px;padding:2px 8px}.X5YCQG_editorModeButton:hover{color:var(--dsw-alias-label-primary)}.X5YCQG_editorModeActive{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}.X5YCQG_editorImageWrap{flex:1;justify-content:center;align-items:center;min-height:0;padding:12px;display:flex;overflow:auto}.X5YCQG_editorImage{object-fit:contain;max-width:100%;max-height:100%}.X5YCQG_editorMd{min-height:0;font:var(--dsw-font-xs-13);flex:1;padding:10px 14px;overflow-y:auto}.X5YCQG_editorMd mark[data-dsh-reveal]{background:color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);color:inherit;border-radius:2px;padding:0 1px}.X5YCQG_selectionPopup{z-index:60;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-strong-11);white-space:nowrap;cursor:pointer;border-radius:6px;align-items:center;padding:0 10px;display:inline-flex;position:fixed;transform:translate(-50%,calc(-100% - 8px))}.X5YCQG_selectionPopup:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_chatFileChip{color:inherit;font:inherit;cursor:pointer;vertical-align:baseline;background:#6187d838;border:none;border-radius:6px;align-items:center;margin:0 4px 2px 0;padding:0 8px;line-height:1.6;display:inline-flex}.X5YCQG_chatFileChip:hover{background:#6187d860}.X5YCQG_editorPdf{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-height:0;display:flex}.X5YCQG_editorPdfToolbar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;justify-content:flex-end;padding:6px 8px;display:flex}.X5YCQG_editorPdfStage{flex:1;min-height:0;display:flex;position:relative}.X5YCQG_editorPdfFrame{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.X5YCQG_editorPdfFrameBlocked{pointer-events:none}.X5YCQG_editorPdfDragShield{z-index:4;pointer-events:none;background:0 0;position:absolute;inset:0}.X5YCQG_editorPdfDragShieldActive{pointer-events:auto}body[data-dsh-tab-dragging] .X5YCQG_editorPdfFrame{pointer-events:none!important}body[data-dsh-tab-dragging] .X5YCQG_editorPdfDragShield{pointer-events:auto!important}.X5YCQG_terminalWrap{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.X5YCQG_terminal{flex:1;min-height:0;padding:6px 4px 6px 8px}.X5YCQG_terminal .xterm{height:100%}.X5YCQG_terminalBanner{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex-wrap:wrap;flex:none;align-items:center;gap:8px;padding:3px 10px;display:flex}.X5YCQG_terminalBannerUrl{word-break:break-all;opacity:.85;flex-basis:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.X5YCQG_boundaryError{z-index:50;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex-direction:column;align-items:flex-start;gap:8px;padding:16px;display:flex;position:fixed;top:0;bottom:0;right:0;overflow:auto}.X5YCQG_terminalRetry{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;border-radius:999px;flex:none;padding:1px 8px}.X5YCQG_terminalRetry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_tabBoundaryError{min-height:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex-direction:column;flex:1;align-items:flex-start;gap:8px;padding:12px 16px;display:flex;overflow:auto}.X5YCQG_git{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;overflow:hidden auto}.X5YCQG_gitHeader{flex-wrap:wrap;flex:none;align-items:center;gap:8px;min-height:36px;padding:4px 8px 4px 12px;display:flex}.X5YCQG_gitPicker,.X5YCQG_gitGroupPicker{min-width:0;display:inline-flex}.X5YCQG_gitPicker{flex:1}.X5YCQG_gitGroupPicker{flex:none}.X5YCQG_gitPicker>button,.X5YCQG_gitGroupPicker>button{width:100%}.X5YCQG_gitBranchSelect{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-width:0;height:26px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;border-radius:6px;flex:1;padding:0 6px;overflow:hidden}.X5YCQG_gitRepoList{flex-direction:column;gap:2px;max-height:60vh;display:flex;overflow-y:auto}.X5YCQG_gitRepoItem{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;padding:8px 10px;display:flex}.X5YCQG_gitRepoItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitRepoItem[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_gitRepoName{font-weight:500}.X5YCQG_gitRepoRel{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitGroupSelect{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);width:88px;min-width:72px;height:26px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;border-radius:6px;flex:none;padding:0 4px;overflow:hidden}.X5YCQG_gitTreeDir{width:100%;min-height:26px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);cursor:pointer;text-align:left;background:0 0;border:none;align-items:center;gap:6px;display:flex}.X5YCQG_gitTreeDir:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitTreeDirName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitTreeChevron,.X5YCQG_gitTreeChevronOpen{border-style:solid;border-width:4px 0 4px 6px;border-color:transparent transparent transparent var(--dsw-alias-label-tertiary);flex:none;width:0;height:0}.X5YCQG_gitTreeChevronOpen{transform:rotate(90deg)}.X5YCQG_gitTreeFile{min-width:0}.X5YCQG_gitTreeFile .X5YCQG_gitRow{min-height:28px;margin:0;padding:0 4px 0 0}.X5YCQG_gitLogFileName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitGroupHeader{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);padding:4px 16px 2px}.X5YCQG_gitSection{border-top:1px solid var(--dsw-alias-border-l1)}.X5YCQG_gitSectionHeader{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);text-transform:uppercase;justify-content:space-between;align-items:center;padding:6px 12px 4px;display:flex}.X5YCQG_gitLink{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;padding:0}.X5YCQG_gitLink:hover:not(:disabled){text-decoration:underline}.X5YCQG_gitLink:disabled{opacity:.4;cursor:default}.X5YCQG_gitRow{min-height:34px;animation:X5YCQG_dsh-row-in .15s var(--ds-ease-in-out);border-radius:8px;align-items:center;gap:6px;margin:0 6px;padding:0 8px;display:flex}.X5YCQG_gitRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitRowSelected{background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_gitRowMain{cursor:pointer;text-align:left;background:0 0;border:none;flex:1;align-items:center;gap:8px;min-width:0;padding:3px 0;display:flex}.X5YCQG_gitBadge{width:20px;height:16px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;display:inline-flex}.X5YCQG_gitName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.X5YCQG_gitAdded{color:var(--dsw-alias-state-success-primary)}.X5YCQG_gitUntracked{color:var(--dsw-alias-state-error-primary)}.X5YCQG_gitModified{color:var(--dsw-alias-state-business-primary)}.X5YCQG_gitDeleted{color:var(--dsw-alias-label-tertiary)}.X5YCQG_gitConflict{color:var(--dsw-alias-state-warn-primary)}.X5YCQG_gitDeletedText{text-decoration:line-through}.X5YCQG_gitEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);padding:4px 12px 8px}.X5YCQG_gitPlaceholder{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;padding:16px}.X5YCQG_gitError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;padding:8px 12px}.X5YCQG_gitDiff{border-top:1px solid var(--dsw-alias-border-l1);padding:8px}.X5YCQG_gitDiffTab{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;overflow:hidden auto}.X5YCQG_gitDiffTabHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.X5YCQG_gitDiffTabTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.X5YCQG_gitDiffFile{align-items:baseline;gap:6px;padding:8px 2px 2px;display:flex}.X5YCQG_gitDiffFilePath{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitDiffFileOld{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;overflow:hidden}.X5YCQG_gitDiffFileTag{border:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:0 6px}.X5YCQG_gitDiffHunk{font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-tertiary);gap:8px;padding:3px 2px;display:flex}.X5YCQG_gitDiffHunkHeader{color:var(--dsw-alias-label-secondary);flex:none}.X5YCQG_gitDiffHunkSection{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitDiffLine{font:var(--dsw-font-markdown-code-block-small);white-space:pre-wrap;overflow-wrap:anywhere;align-items:stretch;min-width:0;line-height:20px;display:flex}.X5YCQG_gitDiffNum{text-align:right;width:36px;color:var(--dsw-alias-label-tertiary);user-select:none;flex:none;padding-right:8px}.X5YCQG_gitDiffCode{flex:1;min-width:0;overflow:visible}.X5YCQG_gitDiffCtx{color:var(--dsw-alias-label-primary)}.X5YCQG_gitDiffDel{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}.X5YCQG_gitDiffAdd{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}.X5YCQG_gitDiffMeta{padding-left:2px}.X5YCQG_gitDiffMetaText{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);font-style:italic}.X5YCQG_gitDiffExpand{width:100%;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-brand-primary);cursor:pointer;text-align:center;background:0 0;border:none;margin:4px 0;display:block}.X5YCQG_gitDiffExpand:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitConfirmDesc{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);white-space:pre-wrap;margin:0}.X5YCQG_gitCommit{border-top:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:8px 12px;display:flex}.X5YCQG_gitCommitInput{flex:1;min-width:0}.X5YCQG_gitCommitButton{background:var(--dsw-alias-button-primary-fill);height:26px;color:var(--dsw-alias-label-primary-inverted);font:var(--dsw-font-xxs-strong-12);cursor:pointer;border:none;border-radius:6px;flex:none;padding:0 12px}.X5YCQG_gitCommitButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.X5YCQG_gitCommitButton:disabled{opacity:.45;cursor:default}.X5YCQG_gitLogTableHead,.X5YCQG_gitLogRow{box-sizing:border-box;grid-template-columns:minmax(0,1fr) 108px 88px;align-items:center;gap:8px;width:100%;min-height:28px;padding:0 10px;display:grid}.X5YCQG_gitLogTableHead{z-index:1;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1);height:26px;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);flex:none;position:sticky;top:0}.X5YCQG_gitLogRow{text-align:left;cursor:pointer;color:inherit;background:0 0;border:none;border-radius:0}.X5YCQG_gitLogRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitLogRowActive{background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_gitLogPane{flex-direction:column;height:100%;min-height:0;display:flex}.X5YCQG_gitLogToolbar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;justify-content:space-between;align-items:center;height:32px;padding:0 10px;display:flex}.X5YCQG_gitLogToolbarTitle{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);text-transform:uppercase}.X5YCQG_gitLogSplit{flex:1;min-height:0;display:flex}.X5YCQG_gitLogList{flex:none;min-width:180px;overflow:auto}.X5YCQG_gitLogDetail{flex-direction:column;flex:1;min-width:0;display:flex;overflow:hidden}.X5YCQG_gitLogDetailFoot{border-top:1px solid var(--dsw-alias-border-l1);flex:none;padding:8px 12px 10px}.X5YCQG_gitLogRefs{flex-wrap:wrap;gap:4px;margin-top:6px;display:flex}.X5YCQG_gitLogFiles{flex:none;min-height:72px;overflow:auto}.X5YCQG_gitLogFile{text-align:left;width:100%;min-width:0;font:var(--dsw-font-xxs-12);color:inherit;cursor:grab;background:0 0;border:none;align-items:center;padding:3px 8px 3px 0;display:flex}.X5YCQG_gitDiffFile[draggable=true]{cursor:grab}.X5YCQG_gitLogFile:hover{background:var(--dsw-alias-interactive-bg-hover)}.X5YCQG_gitLogFileActive{background:var(--dsw-alias-interactive-bg-active)}.X5YCQG_gitLogPatch{flex:1;min-height:0;overflow:auto}.X5YCQG_gitLogColSubject,.X5YCQG_gitLogColAuthor,.X5YCQG_gitLogColDate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_gitLogColSubject{min-width:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-primary)}.X5YCQG_gitLogColAuthor{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}.X5YCQG_gitLogColDate{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:right}.X5YCQG_gitLogHash{font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-tertiary);flex:none}.X5YCQG_gitLogRef{border:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-brand-primary);white-space:nowrap;border-radius:999px;flex:none;padding:0 5px}.X5YCQG_gitLogSubject{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.X5YCQG_gitLogMeta{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.X5YCQG_gitLogMore{border:1px solid var(--dsw-alias-border-l2);width:calc(100% - 24px);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;margin:4px 12px 8px;padding:6px 0;display:block}.X5YCQG_gitLogMore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_gitLogMore:disabled{opacity:.5;cursor:default}.X5YCQG_producedRow{flex-wrap:wrap;align-items:center;gap:8px;padding:4px 0;display:flex}.X5YCQG_producedLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.X5YCQG_producedChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-width:200px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);cursor:pointer;border-radius:999px;align-items:center;gap:4px;padding:2px 8px;display:inline-flex;overflow:hidden}.X5YCQG_producedChip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.X5YCQG_producedChip span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X5YCQG_producedMore{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.X5YCQG_bottomClose:focus-visible,.X5YCQG_iconButton:focus-visible,.X5YCQG_tab:focus-visible,.X5YCQG_tabClose:focus-visible,.X5YCQG_paneCard:focus-visible,.X5YCQG_explorerRow:focus-visible,.X5YCQG_explorerRef:focus-visible,.X5YCQG_gitRowMain:focus-visible,.X5YCQG_gitLink:focus-visible,.X5YCQG_gitCommitButton:focus-visible,.X5YCQG_gitLogRow:focus-visible,.X5YCQG_gitLogMore:focus-visible,.X5YCQG_gitDiffExpand:focus-visible,.X5YCQG_terminalRetry:focus-visible,.X5YCQG_editorModeButton:focus-visible,.X5YCQG_editorDownloadLink:focus-visible,.X5YCQG_editorPptxButton:focus-visible,.X5YCQG_editorDocxZoomRange:focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}@media (prefers-reduced-motion:reduce){.X5YCQG_panel,.X5YCQG_panelHidden,.X5YCQG_bottomPanel,.X5YCQG_bottomPanelHidden,.X5YCQG_tab,.X5YCQG_paneCard,.X5YCQG_explorerRow,.X5YCQG_gitRow,.X5YCQG_divider,.X5YCQG_dividerRow:after,.X5YCQG_dividerCol:after{transition:none;animation:none}}@media (width<=767px){.X5YCQG_panel:not(.X5YCQG_panelHidden) .X5YCQG_tabBar{padding-right:40px}.X5YCQG_tab{min-width:48px;max-width:128px}}";
			tagId$3 = "dsh-external/dsh-better-sidebar/sidebar.module.css";
			if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-external/dsh-better-sidebar";
				tag.dataset.pluginCss = tagId$3;
				tag.textContent = css$3;
				document.head.appendChild(tag);
			}
			sidebar_module_css_default = {
				"sandboxDot": "X5YCQG_sandboxDot",
				"panelResizeActive": "X5YCQG_panelResizeActive",
				"browserBlockedButton": "X5YCQG_browserBlockedButton",
				"editorPdf": "X5YCQG_editorPdf",
				"gitBranchSelect": "X5YCQG_gitBranchSelect",
				"gitPicker": "X5YCQG_gitPicker",
				"editorDownloadLink": "X5YCQG_editorDownloadLink",
				"gitLogColDate": "X5YCQG_gitLogColDate",
				"gitUntracked": "X5YCQG_gitUntracked",
				"paneCard": "X5YCQG_paneCard",
				"browserInput": "X5YCQG_browserInput",
				"terminalWrap": "X5YCQG_terminalWrap",
				"boundaryError": "X5YCQG_boundaryError",
				"dropCenter": "X5YCQG_dropCenter",
				"explorerRef": "X5YCQG_explorerRef",
				"editorBinaryNotice": "X5YCQG_editorBinaryNotice",
				"gitConflict": "X5YCQG_gitConflict",
				"reviewGroupCount": "X5YCQG_reviewGroupCount",
				"gitLogPane": "X5YCQG_gitLogPane",
				"chatFileChip": "X5YCQG_chatFileChip",
				"reviewGroupHeader": "X5YCQG_reviewGroupHeader",
				"browserMessage": "X5YCQG_browserMessage",
				"gitDiffTabHeader": "X5YCQG_gitDiffTabHeader",
				"explorerRow": "X5YCQG_explorerRow",
				"gitLogSubject": "X5YCQG_gitLogSubject",
				"editorPdfDragShieldActive": "X5YCQG_editorPdfDragShieldActive",
				"dropLeft": "X5YCQG_dropLeft",
				"centerTabClose": "X5YCQG_centerTabClose",
				"workbench": "X5YCQG_workbench",
				"reviewGroupTurn": "X5YCQG_reviewGroupTurn",
				"gitDiffHunkSection": "X5YCQG_gitDiffHunkSection",
				"explorerRoot": "X5YCQG_explorerRoot",
				"dirtyDot": "X5YCQG_dirtyDot",
				"gitDiffNum": "X5YCQG_gitDiffNum",
				"headerDropActive": "X5YCQG_headerDropActive",
				"gitLogHash": "X5YCQG_gitLogHash",
				"gitCommitInput": "X5YCQG_gitCommitInput",
				"reviewGroupMeta": "X5YCQG_reviewGroupMeta",
				"iconButton": "X5YCQG_iconButton",
				"editorHtml": "X5YCQG_editorHtml",
				"editorPdfStage": "X5YCQG_editorPdfStage",
				"explorerFindName": "X5YCQG_explorerFindName",
				"gitLogDetailFoot": "X5YCQG_gitLogDetailFoot",
				"gitName": "X5YCQG_gitName",
				"explorerFindList": "X5YCQG_explorerFindList",
				"reviewBar": "X5YCQG_reviewBar",
				"reviewToolbarGrow": "X5YCQG_reviewToolbarGrow",
				"centerPreviewBody": "X5YCQG_centerPreviewBody",
				"reviewRow": "X5YCQG_reviewRow",
				"bottomResizeActive": "X5YCQG_bottomResizeActive",
				"gitLogFileName": "X5YCQG_gitLogFileName",
				"gitConfirmDesc": "X5YCQG_gitConfirmDesc",
				"tabBadge": "X5YCQG_tabBadge",
				"editorStatus": "X5YCQG_editorStatus",
				"panelResize": "X5YCQG_panelResize",
				"reviewToolbar": "X5YCQG_reviewToolbar",
				"divider": "X5YCQG_divider",
				"browserStart": "X5YCQG_browserStart",
				"gitDiff": "X5YCQG_gitDiff",
				"browserBlockedActions": "X5YCQG_browserBlockedActions",
				"activityBadge": "X5YCQG_activityBadge",
				"gitCommit": "X5YCQG_gitCommit",
				"gitTreeChevronOpen": "X5YCQG_gitTreeChevronOpen",
				"activityActive": "X5YCQG_activityActive",
				"reviewBarLabel": "X5YCQG_reviewBarLabel",
				"editorPlaceholder": "X5YCQG_editorPlaceholder",
				"gitDiffExpand": "X5YCQG_gitDiffExpand",
				"gitLogColSubject": "X5YCQG_gitLogColSubject",
				"gitLogTableHead": "X5YCQG_gitLogTableHead",
				"centerPreview": "X5YCQG_centerPreview",
				"activityItem": "X5YCQG_activityItem",
				"gitEmpty": "X5YCQG_gitEmpty",
				"producedLabel": "X5YCQG_producedLabel",
				"reviewMain": "X5YCQG_reviewMain",
				"gitDeleted": "X5YCQG_gitDeleted",
				"gitBadge": "X5YCQG_gitBadge",
				"gitDiffFileTag": "X5YCQG_gitDiffFileTag",
				"gitDiffTab": "X5YCQG_gitDiffTab",
				"editorPathHeader": "X5YCQG_editorPathHeader",
				"gitLogRef": "X5YCQG_gitLogRef",
				"terminalBanner": "X5YCQG_terminalBanner",
				"editorPdfFrameBlocked": "X5YCQG_editorPdfFrameBlocked",
				"sandboxStatusOn": "X5YCQG_sandboxStatusOn",
				"gitDiffAdd": "X5YCQG_gitDiffAdd",
				"reviewSessionTitle": "X5YCQG_reviewSessionTitle",
				"panelHidden": "X5YCQG_panelHidden",
				"dropOverlay": "X5YCQG_dropOverlay",
				"centerViewBar": "X5YCQG_centerViewBar",
				"activityBarRight": "X5YCQG_activityBarRight",
				"editorTitle": "X5YCQG_editorTitle",
				"browser": "X5YCQG_browser",
				"gitTreeDir": "X5YCQG_gitTreeDir",
				"dropDown": "X5YCQG_dropDown",
				"explorerError": "X5YCQG_explorerError",
				"gitLogRefs": "X5YCQG_gitLogRefs",
				"editorPptxButton": "X5YCQG_editorPptxButton",
				"reviewName": "X5YCQG_reviewName",
				"panelBody": "X5YCQG_panelBody",
				"gitRepoItem": "X5YCQG_gitRepoItem",
				"gitPlaceholder": "X5YCQG_gitPlaceholder",
				"headerStripDrop": "X5YCQG_headerStripDrop",
				"explorerFindRow": "X5YCQG_explorerFindRow",
				"sandboxStatus": "X5YCQG_sandboxStatus",
				"gitDeletedText": "X5YCQG_gitDeletedText",
				"editorPdfFrame": "X5YCQG_editorPdfFrame",
				"gitLogFiles": "X5YCQG_gitLogFiles",
				"editorDocxZoomRange": "X5YCQG_editorDocxZoomRange",
				"gitHeader": "X5YCQG_gitHeader",
				"gitGroupPicker": "X5YCQG_gitGroupPicker",
				"split": "X5YCQG_split",
				"paneTabHidden": "X5YCQG_paneTabHidden",
				"reviewKind": "X5YCQG_reviewKind",
				"tabTitle": "X5YCQG_tabTitle",
				"tabList": "X5YCQG_tabList",
				"dividerCol": "X5YCQG_dividerCol",
				"gitLogFileActive": "X5YCQG_gitLogFileActive",
				"gitLogMeta": "X5YCQG_gitLogMeta",
				"tabClose": "X5YCQG_tabClose",
				"gitGroupSelect": "X5YCQG_gitGroupSelect",
				"editorError": "X5YCQG_editorError",
				"explorerBody": "X5YCQG_explorerBody",
				"dividerRow": "X5YCQG_dividerRow",
				"panel": "X5YCQG_panel",
				"bottomPanel": "X5YCQG_bottomPanel",
				"editorImageWrap": "X5YCQG_editorImageWrap",
				"explorerFindLocation": "X5YCQG_explorerFindLocation",
				"editorBinary": "X5YCQG_editorBinary",
				"gitLogSplit": "X5YCQG_gitLogSplit",
				"centerPreviewTabs": "X5YCQG_centerPreviewTabs",
				"sandboxStatusOff": "X5YCQG_sandboxStatusOff",
				"gitCommitButton": "X5YCQG_gitCommitButton",
				"reviewRoot": "X5YCQG_reviewRoot",
				"gitSectionHeader": "X5YCQG_gitSectionHeader",
				"gitLogMore": "X5YCQG_gitLogMore",
				"gitRowMain": "X5YCQG_gitRowMain",
				"centerView": "X5YCQG_centerView",
				"dropUp": "X5YCQG_dropUp",
				"reviewFilterBtn": "X5YCQG_reviewFilterBtn",
				"explorer": "X5YCQG_explorer",
				"gitLogPatch": "X5YCQG_gitLogPatch",
				"tabActive": "X5YCQG_tabActive",
				"editorModeButton": "X5YCQG_editorModeButton",
				"reviewHunkError": "X5YCQG_reviewHunkError",
				"gitGroupHeader": "X5YCQG_gitGroupHeader",
				"browserBlocked": "X5YCQG_browserBlocked",
				"gitRow": "X5YCQG_gitRow",
				"paneDrop": "X5YCQG_paneDrop",
				"explorerFind": "X5YCQG_explorerFind",
				"bottomClose": "X5YCQG_bottomClose",
				"explorerDir": "X5YCQG_explorerDir",
				"reviewDone": "X5YCQG_reviewDone",
				"editorPdfDragShield": "X5YCQG_editorPdfDragShield",
				"editor": "X5YCQG_editor",
				"reviewSessionTime": "X5YCQG_reviewSessionTime",
				"gitLogToolbar": "X5YCQG_gitLogToolbar",
				"centerPreviewTabActive": "X5YCQG_centerPreviewTabActive",
				"gitRepoList": "X5YCQG_gitRepoList",
				"cornerHandle": "X5YCQG_cornerHandle",
				"editorCm": "X5YCQG_editorCm",
				"gitModified": "X5YCQG_gitModified",
				"reviewGroupPrompt": "X5YCQG_reviewGroupPrompt",
				"gitDiffLine": "X5YCQG_gitDiffLine",
				"editorHeader": "X5YCQG_editorHeader",
				"explorerCopied": "X5YCQG_explorerCopied",
				"conversationDropActive": "X5YCQG_conversationDropActive",
				"editorImage": "X5YCQG_editorImage",
				"editorCmHidden": "X5YCQG_editorCmHidden",
				"explorerFindMark": "X5YCQG_explorerFindMark",
				"editorModeActive": "X5YCQG_editorModeActive",
				"gitLogColAuthor": "X5YCQG_gitLogColAuthor",
				"reviewCount": "X5YCQG_reviewCount",
				"terminalBannerUrl": "X5YCQG_terminalBannerUrl",
				"editorBanner": "X5YCQG_editorBanner",
				"gitLogDetail": "X5YCQG_gitLogDetail",
				"explorerHidden": "X5YCQG_explorerHidden",
				"explorerName": "X5YCQG_explorerName",
				"bottomPanelHidden": "X5YCQG_bottomPanelHidden",
				"reviewFilterActive": "X5YCQG_reviewFilterActive",
				"reviewGroup": "X5YCQG_reviewGroup",
				"centerPreviewLabel": "X5YCQG_centerPreviewLabel",
				"gitLink": "X5YCQG_gitLink",
				"gitDiffFileOld": "X5YCQG_gitDiffFileOld",
				"explorerFindInput": "X5YCQG_explorerFindInput",
				"explorerFindModule": "X5YCQG_explorerFindModule",
				"paneContent": "X5YCQG_paneContent",
				"reviewFilter": "X5YCQG_reviewFilter",
				"gitRowSelected": "X5YCQG_gitRowSelected",
				"conversationDrop": "X5YCQG_conversationDrop",
				"gitLogList": "X5YCQG_gitLogList",
				"bottomResize": "X5YCQG_bottomResize",
				"gitError": "X5YCQG_gitError",
				"gitDiffMeta": "X5YCQG_gitDiffMeta",
				"reviewActions": "X5YCQG_reviewActions",
				"browserBar": "X5YCQG_browserBar",
				"reviewHunkBar": "X5YCQG_reviewHunkBar",
				"selectionPopup": "X5YCQG_selectionPopup",
				"gitTreeDirName": "X5YCQG_gitTreeDirName",
				"explorerEmpty": "X5YCQG_explorerEmpty",
				"orphanedType": "X5YCQG_orphanedType",
				"tabBoundaryError": "X5YCQG_tabBoundaryError",
				"headerDrop": "X5YCQG_headerDrop",
				"reviewSession": "X5YCQG_reviewSession",
				"gitDiffDel": "X5YCQG_gitDiffDel",
				"producedChip": "X5YCQG_producedChip",
				"gitDiffHunkHeader": "X5YCQG_gitDiffHunkHeader",
				"dividerActive": "X5YCQG_dividerActive",
				"pane": "X5YCQG_pane",
				"editorModeToggle": "X5YCQG_editorModeToggle",
				"gitDiffTabTitle": "X5YCQG_gitDiffTabTitle",
				"browserFrame": "X5YCQG_browserFrame",
				"reviewUndo": "X5YCQG_reviewUndo",
				"gitDiffHunk": "X5YCQG_gitDiffHunk",
				"editorMd": "X5YCQG_editorMd",
				"producedMore": "X5YCQG_producedMore",
				"reviewBarGrow": "X5YCQG_reviewBarGrow",
				"reviewSessionHeader": "X5YCQG_reviewSessionHeader",
				"producedRow": "X5YCQG_producedRow",
				"gitDiffCtx": "X5YCQG_gitDiffCtx",
				"browserBlockedTitle": "X5YCQG_browserBlockedTitle",
				"git": "X5YCQG_git",
				"editorStatusError": "X5YCQG_editorStatusError",
				"explorerHeader": "X5YCQG_explorerHeader",
				"gitTreeFile": "X5YCQG_gitTreeFile",
				"dsh-row-in": "X5YCQG_dsh-row-in",
				"reviewPrompt": "X5YCQG_reviewPrompt",
				"splitRow": "X5YCQG_splitRow",
				"splitChild": "X5YCQG_splitChild",
				"reviewBarError": "X5YCQG_reviewBarError",
				"paneEmptyCards": "X5YCQG_paneEmptyCards",
				"tabBarDrop": "X5YCQG_tabBarDrop",
				"gitRepoRel": "X5YCQG_gitRepoRel",
				"gitSection": "X5YCQG_gitSection",
				"gitAdded": "X5YCQG_gitAdded",
				"gitDiffMetaText": "X5YCQG_gitDiffMetaText",
				"reviewPath": "X5YCQG_reviewPath",
				"reviewList": "X5YCQG_reviewList",
				"sandboxStatusText": "X5YCQG_sandboxStatusText",
				"reviewKeep": "X5YCQG_reviewKeep",
				"gitTreeChevron": "X5YCQG_gitTreeChevron",
				"gitLogToolbarTitle": "X5YCQG_gitLogToolbarTitle",
				"reviewEmpty": "X5YCQG_reviewEmpty",
				"reviewError": "X5YCQG_reviewError",
				"terminal": "X5YCQG_terminal",
				"centerPreviewClose": "X5YCQG_centerPreviewClose",
				"centerPreviewTab": "X5YCQG_centerPreviewTab",
				"gitLogRow": "X5YCQG_gitLogRow",
				"gitDiffFilePath": "X5YCQG_gitDiffFilePath",
				"sandboxAction": "X5YCQG_sandboxAction",
				"paneTab": "X5YCQG_paneTab",
				"gitRepoName": "X5YCQG_gitRepoName",
				"gitDiffCode": "X5YCQG_gitDiffCode",
				"terminalRetry": "X5YCQG_terminalRetry",
				"centerViewAction": "X5YCQG_centerViewAction",
				"tab": "X5YCQG_tab",
				"gitDiffFile": "X5YCQG_gitDiffFile",
				"gitLogFile": "X5YCQG_gitLogFile",
				"reviewGhost": "X5YCQG_reviewGhost",
				"editorPdfToolbar": "X5YCQG_editorPdfToolbar",
				"browserBlockedDesc": "X5YCQG_browserBlockedDesc",
				"activityBar": "X5YCQG_activityBar",
				"reviewLoadMore": "X5YCQG_reviewLoadMore",
				"gitLogRowActive": "X5YCQG_gitLogRowActive",
				"splitCol": "X5YCQG_splitCol",
				"dropRight": "X5YCQG_dropRight",
				"tabBar": "X5YCQG_tabBar"
			};
		}));
		//#endregion
		//#region src/client/TabBar.tsx
		/**
		* The tab strip of one pane: tabs capped at TAB_MAX_WIDTH (ellipsized),
		* overflow scrolls horizontally, a close button per tab, and drag/drop
		* support. New views open from the workbench's activity bar (the + menu is
		* gone), so `onNewTab`/`newTabOptions` are optional here — `PaneEmptyCards`
		* still offers the openable types on an empty pane. `stripTabFilter`
		* limits the strip to file-preview/aux tabs (editor / diff / git-log) when
		* the activity bar owns the tool views.
		*/
		function serializeDrag(payload) {
			return JSON.stringify(payload);
		}
		function parseOpenTab(value) {
			if (value === null || typeof value !== "object") return void 0;
			const record = value;
			if (typeof record.id !== "string" || typeof record.type !== "string" || typeof record.title !== "string") return;
			return value;
		}
		function parseDrag(raw) {
			try {
				const parsed = JSON.parse(raw);
				if (typeof parsed.tabId !== "string" || typeof parsed.paneId !== "string") return null;
				const openTab = parseOpenTab(parsed.openTab);
				return openTab === void 0 ? {
					tabId: parsed.tabId,
					paneId: parsed.paneId
				} : {
					tabId: parsed.tabId,
					paneId: parsed.paneId,
					openTab
				};
			} catch {
				return null;
			}
		}
		/** Global tab-drag flag: PDF iframes become non-interactive synchronously. */
		function setTabDragging(active) {
			if (active) document.body.setAttribute("data-dsh-tab-dragging", "");
			else document.body.removeAttribute("data-dsh-tab-dragging");
		}
		/** Start a workbench / conversation-column drag that opens `tab` on drop. */
		function beginOpenTabDrag(event, tab) {
			if (event.dataTransfer === null) return;
			setTabDragging(true);
			event.dataTransfer.setData(TAB_DRAG_TYPE, serializeDrag({
				tabId: tab.id,
				paneId: "seed",
				openTab: tab
			}));
			event.dataTransfer.effectAllowed = "copyMove";
		}
		function TabBar(props) {
			const { paneId, tabs, active, onActivate, onClose, onDropTab, onDockToCenter, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter } = props;
			const [dragOver, setDragOver] = (0, react.useState)(false);
			const listRef = (0, react.useRef)(null);
			const stripTabs = stripTabFilter === void 0 ? tabs : tabs.filter(stripTabFilter);
			(0, react.useEffect)(() => {
				const el = listRef.current;
				if (el === null) return;
				const onWheel = (event) => {
					if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
					if (el.scrollWidth <= el.clientWidth) return;
					event.preventDefault();
					const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
					el.scrollLeft += (event.deltaX + event.deltaY) * unit;
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				return () => {
					el.removeEventListener("wheel", onWheel);
				};
			}, [stripTabs.length]);
			(0, react.useEffect)(() => {
				const clear = () => {
					setTabDragging(false);
					setDragOver(false);
				};
				window.addEventListener("dragend", clear, true);
				window.addEventListener("drop", clear, true);
				window.addEventListener("blur", clear);
				return () => {
					window.removeEventListener("dragend", clear, true);
					window.removeEventListener("drop", clear, true);
					window.removeEventListener("blur", clear);
				};
			}, []);
			if (stripTabs.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.tabBar, dragOver && sidebar_module_css_default.tabBarDrop),
				onDragOver: (event) => {
					event.preventDefault();
					event.stopPropagation();
					setDragOver(true);
				},
				onDragLeave: () => {
					setDragOver(false);
				},
				onDrop: (event) => {
					event.preventDefault();
					event.stopPropagation();
					setDragOver(false);
					setTabDragging(false);
					const payload = parseDrag(event.dataTransfer.getData(TAB_DRAG_TYPE));
					if (payload !== null) onDropTab(payload, null);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: listRef,
					className: sidebar_module_css_default.tabList,
					children: stripTabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: clsx(sidebar_module_css_default.tab, active === tab.id && sidebar_module_css_default.tabActive),
						title: tab.title,
						draggable: true,
						onDragStart: (event) => {
							setTabDragging(true);
							event.dataTransfer.setData(TAB_DRAG_TYPE, serializeDrag({
								tabId: tab.id,
								paneId
							}));
							event.dataTransfer.effectAllowed = "move";
						},
						onDragEnd: () => {
							setTabDragging(false);
							setDragOver(false);
						},
						onDragOver: (event) => {
							event.preventDefault();
							event.stopPropagation();
						},
						onDrop: (event) => {
							event.preventDefault();
							event.stopPropagation();
							setTabDragging(false);
							const payload = parseDrag(event.dataTransfer.getData(TAB_DRAG_TYPE));
							if (payload !== null) onDropTab(payload, tab.id);
						},
						onClick: () => {
							onActivate(tab.id);
						},
						onDoubleClick: (event) => {
							if (onDockToCenter === void 0) return;
							event.preventDefault();
							event.stopPropagation();
							onDockToCenter(tab.id);
						},
						onAuxClick: (event) => {
							if (event.button === 1) {
								event.preventDefault();
								onClose(tab.id);
							}
						},
						children: [
							getTabIcon?.(tab) ?? null,
							getTabBadge?.(tab) ?? null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx(sidebar_module_css_default.tabTitle, getTabTitleClass?.(tab)),
								children: tab.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.tabClose,
								"aria-label": t("close"),
								onClick: (event) => {
									event.stopPropagation();
									onClose(tab.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
							})
						]
					}, tab.id))
				})
			});
		}
		var TAB_DRAG_TYPE;
		var init_TabBar = __esmMin((() => {
			init_clsx();
			init_locales();
			init_sidebar_module_css();
			TAB_DRAG_TYPE = "application/x-dsh-tab";
		}));
		//#endregion
		//#region src/client/dom-sync.ts
		/**
		* DOM observers that paint into the host conversation header. A callback
		* that mutates the tree must not re-enter itself, and a drag must not
		* schedule work — both used to freeze the page (MutationObserver + class
		* paints, or drop-pad inserts while `data-dsh-tab-dragging` is on).
		*/
		/** True while a workbench tab or file is being dragged. */
		function isPluginDragActive() {
			return document.body.hasAttribute("data-dsh-tab-dragging") || document.body.hasAttribute("data-dsh-file-dragging");
		}
		/** Explorer / history file rows: pause host-header observers for the gesture. */
		function setFileDragging(active) {
			if (active) document.body.setAttribute("data-dsh-file-dragging", "");
			else document.body.removeAttribute("data-dsh-file-dragging");
		}
		/**
		* Coalesce `work` onto the next animation frame. Re-entry while `work`
		* runs is ignored (our own mutations must not retrigger us). Drags skip
		* the callback entirely so drop-pad CSS / host hover classes cannot loop.
		*/
		function scheduleGuardedFrame(work) {
			let frame = 0;
			let running = false;
			let skippedForDrag = false;
			const run = () => {
				frame = 0;
				if (isPluginDragActive()) {
					skippedForDrag = true;
					return;
				}
				running = true;
				try {
					work();
				} finally {
					running = false;
				}
			};
			const schedule = () => {
				if (running || frame !== 0) return;
				if (isPluginDragActive()) {
					skippedForDrag = true;
					return;
				}
				frame = window.requestAnimationFrame(run);
			};
			const afterDrag = () => {
				if (!skippedForDrag) return;
				skippedForDrag = false;
				schedule();
			};
			window.addEventListener("dragend", afterDrag, true);
			window.addEventListener("drop", afterDrag, true);
			return {
				schedule,
				disconnect: () => {
					window.removeEventListener("dragend", afterDrag, true);
					window.removeEventListener("drop", afterDrag, true);
					if (frame !== 0) window.cancelAnimationFrame(frame);
					frame = 0;
				}
			};
		}
		/**
		* Observe `target` without watching `class` (decorate paints classes).
		* Child-list / selected-tab attribute changes still refresh.
		*/
		function observeHostHeader(target, onChange) {
			const watcher = new MutationObserver(onChange);
			watcher.observe(target, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["aria-selected"]
			});
			return watcher;
		}
		var init_dom_sync = __esmMin((() => {}));
		//#endregion
		//#region src/client/conversation-views.tsx
		/**
		* Dock sidebar tabs onto the conversation header (对话 / 轨迹).
		*
		* Each docked tab is a `conversation.view` list entry so the host paints a
		* tab button. The file body lives in CenterPreview — this file only keeps
		* the header drop pad and the view-id registry.
		*/
		var conversation_views_exports = /* @__PURE__ */ __exportAll({
			centerViewId: () => centerViewId,
			focusLatestCenterView: () => focusLatestCenterView,
			registerConversationViews: () => registerConversationViews
		});
		function centerViewId(tabId) {
			return `${VIEW_PREFIX}${tabId}`;
		}
		/** After a dock, click the matching conversation-view tab so the host strip lights it. */
		function focusLatestCenterView(title) {
			const deadline = Date.now() + 2e3;
			const labelOf = (node) => node.querySelector("[data-dsh-center-label]")?.textContent?.trim() ?? node.textContent?.replace(/[×x]\s*$/u, "").trim() ?? "";
			const selected = (node) => node.getAttribute("aria-selected") === "true" || /\btabActive\b/.test(node.className);
			const tryClick = () => {
				const tabs = [...document.querySelectorAll("[data-slot=\"conversation.session.header\"] [role=\"tab\"]")];
				const match = title === void 0 ? tabs.find((node) => node.hasAttribute("data-dsh-center-tab")) ?? tabs.at(-1) : tabs.find((node) => labelOf(node) === title) ?? tabs.find((node) => node.hasAttribute("data-dsh-center-tab")) ?? tabs.at(-1);
				if (match instanceof HTMLElement && !selected(match)) match.click();
				if (match instanceof HTMLElement && selected(match)) return;
				if (Date.now() < deadline) requestAnimationFrame(tryClick);
			};
			requestAnimationFrame(tryClick);
		}
		/**
		* Invisible drop pad on the conversation header tab strip. Visible only
		* while a sidebar tab is dragged; landing docks the tab as a view tab.
		*/
		function HeaderDropPad(props) {
			const { store } = props;
			(0, react.useEffect)(() => {
				let pad;
				let tablist;
				const onOver = (event) => {
					if (event.dataTransfer === null || !event.dataTransfer.types.includes("application/x-dsh-tab")) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					if (sidebar_module_css_default.headerDropActive !== void 0) pad?.classList.add(sidebar_module_css_default.headerDropActive);
				};
				const onLeave = () => {
					if (sidebar_module_css_default.headerDropActive !== void 0) pad?.classList.remove(sidebar_module_css_default.headerDropActive);
				};
				const onDrop = (event) => {
					event.preventDefault();
					if (sidebar_module_css_default.headerDropActive !== void 0) pad?.classList.remove(sidebar_module_css_default.headerDropActive);
					const payload = parseDrag(event.dataTransfer?.getData("application/x-dsh-tab") ?? "");
					if (payload === null) return;
					const prefs = store.getPrefs();
					store.reduce((s) => dockTabToCenter(s, payload.paneId, payload.tabId, payload.openTab, prefs.centerTabOverflow, prefs.centerTabMax));
					const landed = store.getSnapshot().state?.centerTabs.find((tab) => tab.id === payload.tabId)?.title;
					focusLatestCenterView(landed);
				};
				const mount = () => {
					const header = document.querySelector("[data-slot=\"conversation.session.header\"] header");
					if (!(header instanceof HTMLElement)) return;
					const list = header.querySelector("[role=\"tablist\"]");
					if (!(list instanceof HTMLElement)) return;
					if (pad !== void 0 && tablist === list && list.contains(pad)) return;
					if (pad !== void 0) {
						pad.removeEventListener("dragover", onOver);
						pad.removeEventListener("dragleave", onLeave);
						pad.removeEventListener("drop", onDrop);
						pad.remove();
					}
					tablist = list;
					pad = document.createElement("div");
					pad.className = sidebar_module_css_default.headerDrop ?? "";
					pad.setAttribute("data-dsh-header-drop", "");
					pad.textContent = t("dropToConversation");
					pad.addEventListener("dragover", onOver);
					pad.addEventListener("dragleave", onLeave);
					pad.addEventListener("drop", onDrop);
					list.appendChild(pad);
				};
				const guarded = scheduleGuardedFrame(mount);
				mount();
				const root = document.getElementById("root");
				const watcher = root === null ? void 0 : observeHostHeader(root, guarded.schedule);
				return () => {
					watcher?.disconnect();
					guarded.disconnect();
					if (pad !== void 0) {
						pad.removeEventListener("dragover", onOver);
						pad.removeEventListener("dragleave", onLeave);
						pad.removeEventListener("drop", onDrop);
						pad.remove();
					}
				};
			}, [store]);
			return null;
		}
		/**
		* Keep one `conversation.view` entry per docked tab, plus a header drop pad.
		* Returns the disposer for the fiber.
		*/
		function registerConversationViews(ctx, store) {
			const disposeById = /* @__PURE__ */ new Map();
			const sync = () => {
				const tabs = store.getSnapshot().state?.centerTabs ?? [];
				const want = new Set(tabs.map((tab) => tab.id));
				for (const [id, dispose] of disposeById) if (!want.has(id)) {
					dispose();
					disposeById.delete(id);
				}
				for (const tab of tabs) {
					if (disposeById.has(tab.id)) continue;
					const id = centerViewId(tab.id);
					const tabId = tab.id;
					const dispose = ctx.slots.inject("conversation.view", () => ctx.slots.register({
						name: "conversation.view",
						id,
						order: 100,
						label: () => store.getSnapshot().state?.centerTabs.find((candidate) => candidate.id === tabId)?.title ?? tab.title,
						registrant: "dsh-better-sidebar"
					}, () => null));
					disposeById.set(tab.id, dispose);
				}
			};
			sync();
			const off = store.subscribe(sync);
			const drop = ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: DROP_ID,
				order: 80,
				registrant: "dsh-better-sidebar"
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeaderDropPad, {
				ctx,
				store
			})));
			return () => {
				off();
				drop();
				for (const dispose of disposeById.values()) dispose();
				disposeById.clear();
			};
		}
		var VIEW_PREFIX, DROP_ID;
		var init_conversation_views = __esmMin((() => {
			init_TabBar();
			init_dom_sync();
			init_state();
			init_locales();
			init_sidebar_module_css();
			VIEW_PREFIX = "dsh-center:";
			DROP_ID = "dsh-center-drop";
		}));
		//#endregion
		//#region src/client/service.ts
		init_state();
		init_breakpoints();
		/** Extract the lowercase extension without leading dot from a path. */
		function extOfPath(path) {
			const at = path.lastIndexOf(".");
			if (at === -1) return "";
			const base = path.slice(at + 1).toLowerCase();
			return base.includes("/") || base.includes("\\") ? "" : base;
		}
		/** The file name of a path (both separators). */
		function baseNameOf(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		/**
		* Find the tab type that claims an intercepted external-link URL (v0.13.0+).
		* Walks the descriptors in REGISTRATION order and returns the first one
		* that declares `urlTarget` and matches `url`; a throwing predicate is
		* swallowed (console.error, type skipped) so one broken plugin can never
		* break the whole link pipeline. The caller passes the ENABLED tab
		* descriptors (enablement is the caller's prefs domain — filter
		* `service.getTabs()` through `tabsEnabled` before matching) and falls
		* back to the built-in browser tab when nothing claims the URL (the
		* browser never declares `urlTarget` itself, so it can never shadow a
		* plugin claim).
		*/
		function matchUrlTarget(tabs, url) {
			for (const tab of tabs) {
				if (tab.urlTarget === void 0) continue;
				let claimed = false;
				try {
					claimed = tab.urlTarget(url) === true;
				} catch (error) {
					console.error("[dsh-better-sidebar] urlTarget error:", error);
					continue;
				}
				if (claimed) return tab;
			}
		}
		/**
		* The plugin version this service instance reports. Keep in lockstep with
		* `package.json`'s version — `tests/service.spec.ts` asserts the pair.
		*/
		const SIDEBAR_SERVICE_VERSION = "0.12.2";
		/**
		* Monotonic capability list consumers use to gate new API usage (features
		* are never removed). Each string names a v0.12.0+ capability:
		* - 'badge': TabDescriptor.badge
		* - 'tabLifecycle': TabDescriptor.onOpen/onActivate/onClose
		* - 'updateTab': BetterSidebarService.updateTab
		* - 'openFile': BetterSidebarService.openFile
		* - 'targetedOpen': BetterSidebarService.openTab(seed, scope?)
		* - 'stateSubscription': getSnapshot/subscribeState
		* - 'tabMeta': SidebarTab.meta (seeds, createTab, updateTab, persistence)
		* - 'pluginSettings': SidebarSettingsDeclaration.pluginToggles/render
		* - 'urlTarget' (v0.13.0): TabDescriptor.urlTarget (external-link claims)
		*/
		const SIDEBAR_FEATURES = [
			"badge",
			"tabLifecycle",
			"updateTab",
			"openFile",
			"targetedOpen",
			"stateSubscription",
			"tabMeta",
			"pluginSettings",
			"urlTarget"
		];
		/** Run one plugin callback; a throw is logged and never breaks the caller. */
		function safeCall(fn) {
			try {
				fn();
			} catch (error) {
				console.error("[dsh-better-sidebar] plugin callback error:", error);
			}
		}
		/**
		* Create one BetterSidebar service bound to a store. The service owns the
		* tab/viewer registries (Map + listener set) and proxies openTab/closeTab
		* to the store's reducer. One instance per client plugin activation.
		*/
		function createBetterSidebarService(store) {
			const tabs = /* @__PURE__ */ new Map();
			const viewers = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const fn of [...listeners]) fn();
			};
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			};
			const registerTab = (descriptor) => {
				if (tabs.has(descriptor.id)) throw new Error(`[dsh-better-sidebar] tab type "${descriptor.id}" already registered`);
				tabs.set(descriptor.id, descriptor);
				notify();
				return () => {
					if (tabs.get(descriptor.id) === descriptor) {
						tabs.delete(descriptor.id);
						notify();
					}
				};
			};
			const registerFileViewer = (descriptor) => {
				if (viewers.has(descriptor.id)) throw new Error(`[dsh-better-sidebar] file viewer "${descriptor.id}" already registered`);
				viewers.set(descriptor.id, descriptor);
				notify();
				return () => {
					if (viewers.get(descriptor.id) === descriptor) {
						viewers.delete(descriptor.id);
						notify();
					}
				};
			};
			const getTabs = () => Array.from(tabs.values());
			const getFileViewers = () => Array.from(viewers.values());
			const getTab = (id) => tabs.get(id);
			const isTabEnabled = (id) => store.getPrefs().tabsEnabled[id] !== false;
			const isViewerEnabled = (id) => store.getPrefs().viewersEnabled[id] !== false;
			const matchFileViewer = (path, head) => {
				const ext = extOfPath(path);
				for (const v of Array.from(viewers.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
					if (!isViewerEnabled(v.id)) continue;
					if (head !== void 0 && v.detect !== void 0) {
						if (v.detect(path, head)) return v;
						if (v.exts.length === 0) continue;
					} else if (v.exts.length === 0) {
						if (v.detect === void 0) return v;
						continue;
					}
					if (v.exts.includes(ext)) return v;
				}
			};
			const openTab = (seed, scope) => {
				if (!isTabEnabled(seed.type)) {
					console.warn(`[dsh-better-sidebar] tab type "${seed.type}" is disabled in the side card settings`);
					return;
				}
				const descriptor = tabs.get(seed.type);
				if (descriptor === void 0) return;
				const targetSessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
				if (targetSessionId === void 0) return;
				const callbackScope = scope ?? { sessionId: targetSessionId };
				const activeSessionId = store.getSnapshot().sessionId;
				const targetsInactiveSession = scope !== void 0 && scope.sessionId !== activeSessionId;
				let created;
				let activated;
				const reducer = (state) => {
					let tab;
					let next;
					if (descriptor.createTab !== void 0) {
						const result = descriptor.createTab(state);
						if (result === null) return state;
						tab = result.tab;
						next = applyDedupe(state, result.tab, descriptor, store.getPrefs());
						if (result.patch !== void 0) next = {
							...next,
							...result.patch
						};
					} else {
						tab = {
							id: seed.id ?? seed.type,
							type: seed.type,
							title: seed.title ?? (typeof descriptor.title === "function" ? descriptor.title() : descriptor.title),
							...seed.path !== void 0 ? { path: seed.path } : {},
							...seed.diff !== void 0 ? { diff: seed.diff } : {},
							...seed.meta !== void 0 ? { meta: seed.meta } : {}
						};
						next = applyDedupe(state, tab, descriptor, store.getPrefs());
					}
					const dedupeKey = descriptor.dedupeKey ?? (descriptor.single === true ? () => descriptor.id : void 0);
					const key = dedupeKey?.(tab);
					const inputTabs = allLeaves(state.splits).concat(allLeaves(state.bottomSplits)).flatMap((leaf) => leaf.tabs).concat(state.centerTabs);
					const existedByKey = key !== void 0 && inputTabs.some((candidate) => candidate.type === tab.type && dedupeKey(candidate) === key);
					const existedById = tabOpenIn(state, tab.id);
					const isCreation = !existedByKey && !existedById;
					let landed = next;
					if (seed.url !== void 0 && isCreation) landed = patchTab(next, tab.id, {
						path: seed.url,
						...seed.title !== void 0 ? { title: seed.title } : {}
					});
					if (isCreation) created = allLeaves(landed.splits).concat(allLeaves(landed.bottomSplits)).flatMap((leaf) => leaf.tabs).concat(landed.centerTabs).find((candidate) => candidate.id === tab.id) ?? tab;
					else {
						const candidates = allLeaves(landed.splits).concat(allLeaves(landed.bottomSplits)).flatMap((leaf) => leaf.tabs).concat(landed.centerTabs);
						activated = key !== void 0 ? candidates.find((candidate) => candidate.type === tab.type && dedupeKey(candidate) === key) : candidates.find((candidate) => candidate.id === tab.id);
						activated ??= tab;
					}
					if (!targetsInactiveSession && typeof window !== "undefined" && (seed.path !== void 0 || seed.url !== void 0)) {
						if (isNarrowWidth(window.innerWidth)) {
							if (!landed.panelOpen) return togglePanel(landed);
						} else if (landed.centerTabs.some((item) => item.id === (created ?? activated)?.id)) {} else if (treeOf(landed, landed.activePane ?? "") === "bottomSplits") {
							if (!landed.bottomOpen) return {
								...landed,
								bottomOpen: true
							};
						} else if (!landed.panelOpen) return togglePanel(landed);
					}
					return landed;
				};
				if (targetsInactiveSession) store.reduceFor(scope.sessionId, reducer);
				else store.reduce(reducer);
				if (created !== void 0) safeCall(() => descriptor.onOpen?.(created, callbackScope));
				else if (activated !== void 0) safeCall(() => descriptor.onActivate?.(activated, callbackScope));
				if (!targetsInactiveSession) {
					const landed = store.getSnapshot().state;
					const tab = created ?? activated;
					if (landed !== void 0 && tab !== void 0 && landed.centerTabs.some((item) => item.id === tab.id)) Promise.resolve().then(() => (init_conversation_views(), conversation_views_exports)).then((mod) => {
						mod.focusLatestCenterView(tab.title);
					});
				}
			};
			const closeTab$1 = (tabId, scope) => {
				let closed;
				store.reduce((state) => {
					if (!tabOpenIn(state, tabId)) return state;
					const paneId = findPaneIdOf(state, tabId);
					closed = findTab(state, tabId);
					return closeTab(state, paneId, tabId);
				});
				if (closed !== void 0) {
					const sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
					if (sessionId !== void 0) {
						const descriptor = tabs.get(closed.type);
						safeCall(() => descriptor?.onClose?.(closed, scope ?? { sessionId }));
					}
				}
			};
			/** The snapshot the store publishes (state/prefs carry the active session). */
			const getSnapshot = () => store.getSnapshot();
			/** Store changes: session switch, state mutations, prefs writes. */
			const subscribeState = (listener) => store.subscribe(listener);
			/** Patch an open tab's display fields (a missing tab id is a no-op). */
			const updateTab = (tabId, patch) => {
				store.reduce((state) => patchTab(state, tabId, {
					...patch.title !== void 0 ? { title: patch.title } : {},
					...patch.path !== void 0 ? { path: patch.path } : {},
					...patch.meta !== void 0 ? { meta: patch.meta } : {}
				}));
			};
			/** Activate an open tab (the tab-bar activation path; fires onActivate). */
			const activateTab$1 = (tabId, scope) => {
				let activated;
				store.reduce((state) => {
					if (!tabOpenIn(state, tabId)) return state;
					const paneId = findPaneIdOf(state, tabId);
					activated = findTab(state, tabId);
					return activateTab(state, paneId, tabId);
				});
				if (activated !== void 0) {
					const sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
					if (sessionId !== void 0) {
						const descriptor = tabs.get(activated.type);
						safeCall(() => descriptor?.onActivate?.(activated, scope ?? { sessionId }));
					}
				}
			};
			/** Open a file in the sidebar editor of `scope`'s session (title defaults
			*  to the file name; the tab id is path-derived, like the internal
			*  open-path interception, so distinct files open side by side). */
			const openFile = (scope, path, title) => {
				openTab({
					type: "editor",
					title: title ?? baseNameOf(path),
					path,
					id: `editor:${path}`
				}, scope);
			};
			return {
				registerTab,
				registerFileViewer,
				getTabs,
				getFileViewers,
				getTab,
				isTabEnabled,
				isViewerEnabled,
				matchFileViewer,
				openTab,
				closeTab: closeTab$1,
				subscribe,
				version: SIDEBAR_SERVICE_VERSION,
				features: SIDEBAR_FEATURES,
				getSnapshot,
				subscribeState,
				updateTab,
				activateTab: activateTab$1,
				openFile
			};
		}
		/**
		* Apply dedup: if a tab whose `dedupeKey` matches an existing tab of the
		* same type exists, focus it; otherwise land the tab through
		* `openTabInActivePane` (the id safety net + active-pane landing are that
		* reducer's job — not re-implemented here).
		* `single: true` resolves to the id-key sugar when no explicit key is given.
		*/
		function applyDedupe(state, tab, descriptor, prefs) {
			const dedupeKey = descriptor.dedupeKey ?? (descriptor.single === true ? () => descriptor.id : void 0);
			const key = dedupeKey?.(tab);
			if (key !== void 0) {
				for (const leaf of allLeaves(state.splits).concat(allLeaves(state.bottomSplits))) {
					const existing = leaf.tabs.find((t) => t.type === tab.type && dedupeKey(t) === key);
					if (existing !== void 0) return activateTab(state, leaf.id, existing.id);
				}
				const existing = state.centerTabs.find((t) => t.type === tab.type && dedupeKey(t) === key);
				if (existing !== void 0) return activateTab(state, CENTER_PANE_ID, existing.id);
			}
			if (docksToConversationHeader(tab.type, descriptor)) return dockTabToCenter(state, "seed", tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax);
			return openTabInActivePane(state, tab);
		}
		function docksToConversationHeader(type, descriptor) {
			if (type === "git-log") return false;
			if (type === "editor" || type === "diff") return true;
			return descriptor.hidden === true && descriptor.createTab === void 0;
		}
		/** Find which pane hosts a tab id ('' if none). Either tree or the center strip. */
		function findPaneIdOf(state, tabId) {
			if (state.centerTabs.some((t) => t.id === tabId)) return CENTER_PANE_ID;
			for (const leaf of allLeaves(state.splits).concat(allLeaves(state.bottomSplits))) if (leaf.tabs.some((t) => t.id === tabId)) return leaf.id;
			return state.activePane ?? "";
		}
		//#endregion
		//#region src/client/chunk-loader.ts
		/**
		* The platform externals a chunk bundle may require (mirror of
		* CLIENT_EXTERNALS in tsdown.config.ts — the chunk builds keep these
		* external and the loader resolves them here). A superset is safe: the
		* require only answers what the chunk actually asks for.
		*/
		const CHUNK_EXTERNALS = [
			"react",
			"react/jsx-runtime",
			"react-dom",
			"react-dom/client",
			"cordis",
			"@deepseek-ai/dsh-client-ui-slots",
			"@deepseek-ai/dsh-client-web-react",
			"@deepseek-ai/dsh-client-ui-primitives",
			"@deepseek-ai/dsh-client-schema-form",
			"@deepseek-ai/dsh-client-runtime/client"
		];
		/** Chunk script endpoint served by the plugin host half (src/bundle-route.ts). */
		const CHUNK_URL = (name) => `/sidebar/bundle/${name}.js`;
		/**
		* The module system instance the client entry hands down from the `modules`
		* cordis service (`ctx.get('modules')`). DSH >= 0.1.1 removed the
		* `window.__DSH_MODULES__` global and exposes the module system only through
		* that service, so the entry injects it here; DSH <= 0.1.0 (rc.7) still
		* publishes the global, which stays as the fallback below.
		*/
		let injectedModuleSystem;
		/** Inject the runtime module system (called once per plugin activation). */
		function setChunkModuleSystem(modules) {
			injectedModuleSystem = modules;
		}
		/**
		* Resolve the module system: the injected service instance wins (DSH >= 0.1.1),
		* then the legacy global (DSH <= 0.1.0 rc.7). `undefined` means neither exists.
		*/
		function moduleSystem() {
			if (injectedModuleSystem !== void 0) return injectedModuleSystem;
			return globalThis.__DSH_MODULES__;
		}
		function chunkRegistry() {
			const g = globalThis;
			return g.__dshChunks__ ??= {};
		}
		const defaultScriptLoader = (src) => new Promise((resolve, reject) => {
			const el = document.createElement("script");
			el.async = true;
			el.src = src;
			el.addEventListener("load", () => {
				el.remove();
				resolve();
			}, { once: true });
			el.addEventListener("error", () => {
				el.remove();
				reject(/* @__PURE__ */ new Error(`[dsh-better-sidebar] chunk script ${src} failed to load`));
			}, { once: true });
			document.head.append(el);
		});
		let scriptLoader = defaultScriptLoader;
		/** Test/dev hook: resolve a chunk without fetching a script (e.g. vitest). */
		const testLoaders = /* @__PURE__ */ new Map();
		/** Memoized externals require, resolved once per page from the seed table. */
		let externalsRequire;
		async function buildExternalsRequire(modules) {
			if (externalsRequire !== void 0) return externalsRequire;
			const entries = await Promise.all(CHUNK_EXTERNALS.map(async (spec) => {
				try {
					return [spec, await modules.import(spec)];
				} catch {
					return [spec, void 0];
				}
			}));
			const table = new Map(entries);
			externalsRequire = (spec) => {
				if (!table.has(spec)) throw new Error(`[dsh-better-sidebar] chunk require('${spec}') missed the module table`);
				return table.get(spec);
			};
			return externalsRequire;
		}
		/** In-flight/memoized chunk loads; a failure removes its entry so a retry re-fetches. */
		const cache$1 = /* @__PURE__ */ new Map();
		/**
		* Load (once) and materialize a lazy chunk, returning its module exports.
		* Concurrent callers share one in-flight load; a failure clears the cache
		* entry so the next call retries (the script re-executes and overwrites its
		* global registry slot — assignments are idempotent).
		* @param name - the chunk to load.
		*/
		function loadChunk(name) {
			const cached = cache$1.get(name);
			if (cached !== void 0) return cached;
			const task = (async () => {
				const test = testLoaders.get(name);
				if (test !== void 0) return test();
				const modules = moduleSystem();
				if (modules === void 0) throw new Error(`[dsh-better-sidebar] chunk "${name}": client module system unavailable`);
				await scriptLoader(CHUNK_URL(name));
				const factory = chunkRegistry()[name];
				if (typeof factory !== "function") throw new Error(`[dsh-better-sidebar] chunk "${name}" script did not register its factory`);
				return factory(await buildExternalsRequire(modules));
			})();
			cache$1.set(name, task);
			task.catch(() => {
				cache$1.delete(name);
			});
			return task;
		}
		/**
		* Drop all chunk state for a fresh plugin activation (HMR-safe): clear the
		* in-memory cache and any test-registry entries, so the next lazy open
		* re-fetches and re-executes the current chunk scripts (the registry slots
		* are overwritten by the re-execution — no cleanup needed).
		*/
		function resetChunks() {
			cache$1.clear();
			testLoaders.clear();
			externalsRequire = void 0;
			injectedModuleSystem = void 0;
		}
		//#endregion
		//#region src/client/produced-files.ts
		init_conversation_views();
		/**
		* Pure derivation of one turn's produced files from finalized conversation
		* nodes — a structural replica of ui-deliverables' `producedForClosing`
		* (the mutation tools' follow-along `locations`, by render intent: a diff
		* card or a generic edit card; reads/deletes/failures produce nothing).
		* Kept dependency-free so the takeover logic is unit-testable and the
		* replica is easy to diff against upstream when it drifts.
		*/
		/** Paths a tool-result view reports as produced, by render intent. */
		function producedPaths(view) {
			if (view === null || typeof view !== "object") return [];
			const record = view;
			if (!(record.card === "diff" || record.card === "generic" && record.kind === "edit")) return [];
			if (!Array.isArray(record.locations)) return [];
			const paths = [];
			for (const location of record.locations) if (location !== null && typeof location === "object" && typeof location.path === "string") paths.push(location.path);
			return paths;
		}
		/**
		* Files produced by the turn the assistant at `seq` closes. Accumulation
		* resets on turn boundaries (a user message, or a node reporting a different
		* turn number); paths keep first-seen order and appear once.
		* @param nodes - snapshot nodes in surface order (structural, unknown-safe).
		* @param seq - the closing assistant's seq (the render site's anchor).
		* @returns produced paths; empty when the turn wrote nothing.
		*/
		function producedForClosing(nodes, seq) {
			let pending = [];
			let seen = /* @__PURE__ */ new Set();
			let turn;
			for (const node of nodes) {
				if (node === null || typeof node !== "object") continue;
				const record = node;
				if (record.kind === "tool-result") {
					if (record.isError === true) continue;
					for (const path of producedPaths(record.callView)) {
						if (seen.has(path)) continue;
						seen.add(path);
						pending.push(path);
					}
					continue;
				}
				if (record.kind === "user") {
					turn = void 0;
					pending = [];
					seen = /* @__PURE__ */ new Set();
				} else if (typeof record.turn === "number") {
					if (turn !== void 0 && record.turn !== turn) {
						pending = [];
						seen = /* @__PURE__ */ new Set();
					}
					turn = record.turn;
				}
				if (record.kind === "assistant" && record.seq === seq) return pending;
			}
			return [];
		}
		/**
		* Claim the turn-tail chain only when the closing turn produced files.
		* @param owner - the turn-tail owner currency ({nodes, seq}).
		* @returns produced paths as the matched value, or null to decline.
		*/
		function selectProducedFiles(owner) {
			const record = owner;
			if (record === null || typeof record !== "object") return null;
			if (!Array.isArray(record.nodes) || typeof record.seq !== "number") return null;
			const paths = producedForClosing(record.nodes, record.seq);
			return paths.length === 0 ? null : paths;
		}
		/** Resolve a (possibly relative) path against the session cwd for the sidebar. */
		function resolveSidebarPath(cwd, path) {
			if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) return path;
			const base = cwd ?? "";
			if (base === "") return path;
			const separator = base.includes("\\") ? "\\" : "/";
			return `${base.replace(/[\\/]+$/, "")}${separator}${path}`;
		}
		//#endregion
		//#region src/client/openpath-intercept.ts
		/**
		* Wrap `workspaces.openPath`: intercepted calls open the file in the sidebar
		* editor instead of the Host OS and resolve as success (the original's
		* callers ignore the result); anything that declines falls through to the
		* original method untouched.
		* @param workspaces - the client workspaces service to wrap.
		* @param deps - per-call takeover decisions.
		* @returns the disposer restoring the original method (HMR-safe).
		*/
		function wrapOpenPath(workspaces, deps) {
			const original = workspaces.openPath;
			workspaces.openPath = (path) => {
				if (deps.takeoverEnabled()) {
					const sessionId = deps.currentSessionId();
					if (sessionId !== void 0) {
						deps.openInSidebar(path, sessionId);
						return Promise.resolve();
					}
				}
				return original.call(workspaces, path);
			};
			return () => {
				workspaces.openPath = original;
			};
		}
		//#endregion
		//#region src/client/intercept.tsx
		/**
		* Interception of the chat's produced-files row: the turn-tail chain entry
		* that replaces ui-deliverables' row when the closing turn produced files.
		* The takeover looks identical (same chip row); the chips open the file in
		* the sidebar instead of the host OS. Priority -1 runs before the default-0
		* deliverables entry; when nothing was produced the selector returns null
		* and the original row renders unchanged.
		*/
		init_state();
		init_locales();
		init_sidebar_module_css();
		function editorTabOf(ctx, sessionId, path) {
			const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
			const absolute = resolveSidebarPath(summary?.cwd, path);
			const at = Math.max(absolute.lastIndexOf("/"), absolute.lastIndexOf("\\"));
			return {
				type: "editor",
				title: at === -1 ? absolute : absolute.slice(at + 1),
				path: absolute,
				id: `editor:${absolute}`
			};
		}
		/** Build the workspace-file editor tab for a (possibly relative) path. */
		function editorTabForPath(ctx, sessionId, path) {
			return editorTabOf(ctx, sessionId, path);
		}
		/** Open a file in the sidebar's editor (used by the intercepted row and the explorer). */
		function openSidebarFile(ctx, store, sessionId, path) {
			const tab = editorTabOf(ctx, sessionId, path);
			ctx.betterSidebar?.openTab({
				type: tab.type,
				title: tab.title,
				path: tab.path,
				id: tab.id
			});
		}
		/** Double-click: dock the file onto the conversation header (对话 / 轨迹). */
		function openSidebarFileAbove(ctx, store, sessionId, path) {
			const tab = editorTabOf(ctx, sessionId, path);
			const prefs = store.getPrefs();
			store.reduce((state) => {
				return tabOpenIn(state, tab.id) ? dockTabToCenter(state, findPaneOfTab(state, tab.id), tab.id, void 0, prefs.centerTabOverflow, prefs.centerTabMax) : dockTabToCenter(state, "seed", tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax);
			});
			focusLatestCenterView(tab.title);
		}
		/** The intercepted produced-files row (visual twin of the deliverables chips). */
		function SidebarProducedFiles(props) {
			const { matched, openInSidebar } = props;
			const shown = matched.slice(0, 6);
			const hidden = matched.length - shown.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.producedRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.producedLabel,
						children: t("produced")
					}),
					shown.map((path) => {
						const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
						const name = at === -1 ? path : path.slice(at + 1);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: sidebar_module_css_default.producedChip,
							title: path,
							onClick: () => {
								openInSidebar(path);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: name })]
						}, path);
					}),
					hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: sidebar_module_css_default.producedMore,
						children: ["+", hidden]
					})
				]
			});
		}
		/**
		* Register the turn-tail interception (returns the disposer).
		*
		* The slot is a CHILD slot the host's ui-conversation declares in its
		* `conversation.chat.node` children table (kind: chain, scope: session).
		* Registering it directly races the declaration — the ui-slots core's
		* load-time validation throws "not declared (a parent entry's children
		* table must declare it)" when the parent entry is not on the ledger yet.
		* slots.inject waits for the declaration: the callback runs synchronously
		* when the slot is already declared, otherwise it runs inside the declaring
		* register() call once the declaration commits; declaration collapse
		* disposes the entry and a later declaration re-registers it. This mirrors
		* @deepseek-ai/dsh-client-ui-deliverables' registration of the same slot.
		*/
		function registerTurnTailInterception(ctx, store) {
			return ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				select: (owner) => {
					if (store.getPrefs().tabsEnabled["editor"] === false) return null;
					return selectProducedFiles(owner);
				},
				priority: -1,
				registrant: "dsh-better-sidebar",
				inject: (sessionId) => ({ openInSidebar: (path) => {
					openSidebarFile(ctx, store, sessionId, path);
				} })
			}, SidebarProducedFiles));
		}
		/**
		* Register the chat file-open interception: wraps `ctx.workspaces.openPath`
		* — the single funnel every chat-side file open goes through (tool-row path
		* links, the produced-files row, prose mentions) — so opens land in the
		* sidebar editor instead of the Host OS. Gated by BOTH the `interceptOpenPath`
		* pref and the editor tab's enable switch; declined opens fall through to
		* the original method. Returns the disposer restoring the original (HMR-safe).
		*/
		function registerOpenPathInterception(ctx, store) {
			return wrapOpenPath(ctx.workspaces, {
				takeoverEnabled: () => store.getPrefs().interceptOpenPath !== false && store.getPrefs().tabsEnabled["editor"] !== false,
				currentSessionId: () => ctx.sessions.list.getSnapshot().current,
				openInSidebar: (path, sessionId) => {
					openSidebarFile(ctx, store, sessionId, path);
				}
			});
		}
		//#endregion
		//#region src/client/api.ts
		/** One wire failure. */
		var SidebarApiError = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.code = code;
			}
		};
		async function call(method, payload, signal) {
			let response;
			try {
				response = await fetch(`/sidebar/api/${method}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
					signal
				});
			} catch (error) {
				throw new SidebarApiError("network", error instanceof Error ? error.message : String(error));
			}
			const parsed = await response.json().catch(() => null);
			if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) throw new SidebarApiError(parsed?.error?.code ?? "http", parsed?.error?.message ?? `HTTP ${response.status}`);
			return parsed.value;
		}
		/** Fold a scope into a JSON payload ({cwd} only when present). */
		function scopePayload(scope, extra) {
			return {
				sessionId: scope.sessionId,
				...scope.cwd !== void 0 && scope.cwd !== "" ? { cwd: scope.cwd } : {},
				...scope.repo !== void 0 && scope.repo !== "" ? { repo: scope.repo } : {},
				...extra
			};
		}
		/** The sidebar API surface (session scope threaded through every call). */
		const api = {
			sessionCwd: (scope, signal) => call("session.cwd", scopePayload(scope, {}), signal),
			fsTree: (scope, path, signal) => call("fs.tree", scopePayload(scope, { path }), signal),
			fsFind: (scope, query, signal) => call("fs.find", scopePayload(scope, { query }), signal),
			fsRead: (scope, path, signal) => call("fs.read", scopePayload(scope, { path }), signal),
			fsWrite: (scope, path, content) => call("fs.write", scopePayload(scope, {
				path,
				content
			})),
			fsUnlink: (scope, path) => call("fs.unlink", scopePayload(scope, { path })),
			gitShow: (scope, path, rev, signal) => call("git.show", scopePayload(scope, {
				path,
				rev
			}), signal),
			gitRepos: (scope, signal) => call("git.repos", scopePayload(scope, {}), signal),
			gitStatus: (scope, signal) => call("git.status", scopePayload(scope, {}), signal),
			gitDiff: (scope, path, staged, signal) => call("git.diff", scopePayload(scope, {
				...path !== void 0 ? { path } : {},
				staged
			}), signal),
			gitStage: (scope, path) => call("git.stage", scopePayload(scope, { ...path !== void 0 ? { path } : {} })),
			gitUnstage: (scope, path) => call("git.unstage", scopePayload(scope, { ...path !== void 0 ? { path } : {} })),
			/** Stage tracked modifications/deletions only (untracked files stay put). */
			gitStageTracked: (scope) => call("git.stage-tracked", scopePayload(scope, {})),
			/** Stage the given untracked paths in one batch. */
			gitStageUntracked: (scope, paths) => call("git.stage-untracked", scopePayload(scope, { paths })),
			gitCommit: (scope, message) => call("git.commit", scopePayload(scope, { message })),
			gitBranch: (scope, signal) => call("git.branch", scopePayload(scope, {}), signal),
			gitCheckout: (scope, branch) => call("git.checkout", scopePayload(scope, { branch })),
			/** Recent commit history, lazily pageable (skip/count; defaults 0/30). */
			gitLog: (scope, count, skip, signal) => call("git.log", scopePayload(scope, {
				...count !== void 0 ? { count } : {},
				...skip !== void 0 ? { skip } : {}
			}), signal),
			/** Full patch text of one commit (diff display for the history rows). */
			gitCommitDiff: (scope, hash, signal) => call("git.commit-diff", scopePayload(scope, { hash }), signal),
			/** Discard the worktree changes of one file (the index is untouched). */
			gitDiscard: (scope, path) => call("git.discard", scopePayload(scope, { path })),
			/** Revert one commit onto the current branch. */
			gitRevert: (scope, hash) => call("git.revert", scopePayload(scope, { hash })),
			/** Cherry-pick one commit onto the current branch. */
			gitCherryPick: (scope, hash) => call("git.cherry-pick", scopePayload(scope, { hash })),
			/** Release a terminal's process immediately (tab closed; the WS close frame
			*  may be unreachable while the socket is down, so the host also accepts
			*  this explicit route). */
			ptyClose: (scope, tab) => call("pty.close", scopePayload(scope, { tab })),
			/** Release an agent terminal by uuid (tab closed while WS was down). */
			agentPtyClose: (uuid) => call("agent-pty.close", { uuid }),
			/**
			* The output the model has read so far for one background job (replayed
			* from the owner session's event log — never the model's job_output
			* cursor). The scope MUST be the job's OWNER session.
			*/
			jobOutput: (scope, id, signal) => call("jobs.output", scopePayload(scope, { id }), signal),
			/** Request cancellation of one background job (live jobs flip to stopping). */
			jobKill: (scope, id, reason) => call("jobs.kill", scopePayload(scope, {
				id,
				...reason !== void 0 ? { reason } : {}
			})),
			/** Read this conversation's Keep / Undo ledger from the session directory. */
			reviewGet: (scope, signal) => call("review.get", scopePayload(scope, {}), signal),
			/** Replace this conversation's Keep / Undo ledger on disk. */
			reviewPut: (scope, document) => call("review.put", scopePayload(scope, { document })),
			/** Read the side card preferences (plugin-global, no session scope). */
			settingsGet: () => call("settings.get", {}),
			/** Merge a patch into the side card preferences (revision-guarded). */
			settingsUpdate: (patch, expectedRevision) => call("settings.update", {
				patch,
				...expectedRevision !== void 0 ? { expectedRevision } : {}
			}),
			/** Probe a URL's response headers (the sidebar browser's embeddability
			*  check; see the host's browser.probe route). */
			browserProbe: (url, signal) => call("browser.probe", { url }, signal)
		};
		/** Absolute URL of the media route for one path (images only). */
		function mediaUrl(scope, path) {
			return fileUrl(scope, path, false);
		}
		/** Absolute URL of the download route: serves raw bytes (binary-safe) with
		*  `Content-Disposition: attachment`, so the browser saves the file. */
		function downloadUrl(scope, path) {
			return fileUrl(scope, path, true);
		}
		/** Shared URL builder for the /sidebar/file route (media vs download). */
		function fileUrl(scope, path, download) {
			const params = new URLSearchParams({
				sessionId: scope.sessionId,
				path
			});
			if (scope.cwd !== void 0 && scope.cwd !== "") params.set("cwd", scope.cwd);
			if (download) params.set("download", "1");
			return `/sidebar/file?${params.toString()}`;
		}
		//#endregion
		//#region src/explorer/fs-find-match.ts
		const SOURCE_ROOTS = [
			"src/main/java/",
			"src/test/java/",
			"src/main/kotlin/",
			"src/test/kotlin/",
			"src/main/scala/"
		];
		function fileStem(fileName) {
			const dot = fileName.lastIndexOf(".");
			return dot > 0 ? fileName.slice(0, dot) : fileName;
		}
		/** IDE-style row: class/file name, package or leftover folder, top-level module. */
		function presentFindHit(rel) {
			const path = rel.replace(/\\/g, "/");
			const parts = path.split("/").filter((part) => part !== "");
			const fileName = parts.pop() ?? path;
			if (parts.length === 0) return {
				name: fileName,
				location: null,
				module: null
			};
			const module = parts[0] ?? null;
			const afterModule = parts.slice(1);
			const joined = afterModule.join("/");
			const lower = `${joined}/`.toLowerCase();
			for (const root of SOURCE_ROOTS) {
				const at = lower.indexOf(root);
				if (at === -1) continue;
				const pkg = joined.slice(at + root.length);
				return {
					name: fileStem(fileName),
					location: pkg === "" ? null : pkg.replaceAll("/", "."),
					module
				};
			}
			return {
				name: fileName,
				location: afterModule.length === 0 ? null : afterModule.join("/"),
				module
			};
		}
		//#endregion
		//#region src/client/paths.ts
		/**
		* Path projection helpers shared by the explorer rows: a path relative to
		* the session cwd (for the @-reference button and "copy relative path").
		* The fs-tree joins with '/' even on Windows, so both separators normalize
		* to '/' before comparison.
		*/
		/**
		* The path relative to the session's working directory.
		* @param cwd - the explorer root (absolute).
		* @param path - an absolute entry path from the fs-tree.
		* @returns the relative path with '/' separators ('.' for the cwd itself),
		* or `path` unchanged when it lies outside the cwd.
		*
		* The prefix test is case-insensitive: Windows paths (and macOS's
		* case-insensitive volumes) may arrive with different casing than the cwd
		* row, and the containment decision must not depend on it. The returned
		* relative text keeps the caller's own casing.
		*/
		function relativeTo(cwd, path) {
			const base = cwd.replace(/[\\/]+$/, "");
			const norm = (value) => value.replace(/\\/g, "/");
			const nBase = norm(base);
			const nPath = norm(path);
			if (nPath === nBase) return ".";
			if (nPath.toLowerCase().startsWith(`${nBase.toLowerCase()}/`)) return nPath.slice(nBase.length + 1);
			return path;
		}
		//#endregion
		//#region src/client/selection-payload.ts
		/**
		* Pure payload builders for the "add selection to conversation" popup in the
		* text viewers (markdown preview + the catch-all code viewer). Everything
		* here is string math — no React, no ctx — so the unit tests cover it
		* directly.
		*
		* Path/line header helpers for file chips. The composer shows a Cursor-style
		* chip (`File.java (108-121)`); on send the codec expands a short selection
		* to a fenced `相对路径:起止行` block and drops the body past SELECTION_LIMIT.
		* - The path is relative to the session cwd (the same projection the
		*   explorer's @ button uses); an unknown cwd falls back to the absolute
		*   path.
		* - Line numbers: single-line selections write `path:12`, multi-line write
		*   `path:12-15`. The markdown preview cannot map rendered DOM back to
		*   source lines directly, so it reverse-searches the selected text in the
		*   source and only reports lines on an unambiguous hit (see
		*   {@link linesOfSelection}).
		*/
		/**
		* The fence info line: `rel[:start[-end]]` — lines are omitted entirely
		* when unknown (the preview reverse-search missed).
		*/
		function headerOf(path, cwd, lines) {
			const rel = cwd !== void 0 ? relativeTo(cwd, path) : path;
			if (lines === void 0) return rel;
			if (lines.end > lines.start) return `${rel}:${lines.start}-${lines.end}`;
			return `${rel}:${lines.start}`;
		}
		//#endregion
		//#region src/client/file-ref.ts
		/**
		* File / selection references inserted into the composer as chips (Cursor-
		* style `File.java (108-121)`). The draft holds `@label` (or a U+FFFC
		* placeholder on older hosts); the model form is expanded on send via the
		* `@` trigger source codec.
		*/
		/** Trigger-source name (must match the registered `@` source). */
		const FILE_SOURCE = "file";
		/** Custom drag/clipboard type so the composer can mint a chip, not dump text. */
		const FILE_REF_MIME = "application/x-dsh-file-ref";
		/** Last path segment for the chip label. */
		function fileBaseName$1(path) {
			const trimmed = path.replace(/[\\/]+$/, "");
			const at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return at === -1 ? trimmed : trimmed.slice(at + 1);
		}
		/** Chip label: `File.java` or `File.java (108-121)`. */
		function fileChipLabel(ref) {
			const name = fileBaseName$1(ref.path);
			if (ref.lines === void 0) return name;
			if (ref.lines.end > ref.lines.start) return `${name} (${ref.lines.start}-${ref.lines.end})`;
			return `${name} (${ref.lines.start})`;
		}
		/** One selected line (or a snippet with no span) is typed as plain text, not a chip. */
		function isPlainTextSelection(ref) {
			if (ref.selected === void 0 || ref.selected === "") return false;
			return ref.lines === void 0 || ref.lines.end === ref.lines.start;
		}
		/** Clipboard / persistence projection (`@rel` or `@rel:108-121`). */
		function fileClipboardText(ref) {
			return `@${headerOf(ref.path, void 0, ref.lines)}`;
		}
		/** Project an absolute path to the session cwd when possible. */
		function fileRefOf(path, cwd, lines, selected) {
			const rel = cwd !== void 0 ? relativeTo(cwd, path) : path;
			const snippet = selected !== void 0 && selected.length > 500 ? void 0 : selected;
			return {
				path: rel,
				lines,
				selected: snippet === "" ? void 0 : snippet,
				...path !== rel ? { abs: path } : {}
			};
		}
		function encodeFileRef(ref) {
			return JSON.stringify({
				p: ref.path,
				...ref.lines !== void 0 ? {
					s: ref.lines.start,
					e: ref.lines.end
				} : {},
				...ref.selected !== void 0 ? { t: ref.selected } : {},
				...ref.abs !== void 0 ? { a: ref.abs } : {}
			});
		}
		function decodeFileRef(raw) {
			const trimmed = raw.trim();
			if (trimmed.startsWith("{")) try {
				const parsed = JSON.parse(trimmed);
				if (typeof parsed.p !== "string" || parsed.p === "") return null;
				const start = typeof parsed.s === "number" ? parsed.s : void 0;
				const end = typeof parsed.e === "number" ? parsed.e : start;
				return {
					path: parsed.p,
					...start !== void 0 ? { lines: {
						start,
						end: end ?? start
					} } : {},
					...typeof parsed.t === "string" && parsed.t !== "" ? { selected: parsed.t } : {},
					...typeof parsed.a === "string" && parsed.a !== "" ? { abs: parsed.a } : {}
				};
			} catch {
				return null;
			}
			return parseAtToken(trimmed);
		}
		/** `@rel`, `@rel:12`, `@rel:12-15` (the clipboard projection). */
		function parseAtToken(text) {
			const token = text.trim();
			if (!token.startsWith("@")) return null;
			const body = token.slice(1);
			if (body === "" || /\s/.test(body)) return null;
			const lined = body.match(/^(.*):(\d+)(?:-(\d+))?$/);
			if (lined !== null && lined[1] !== "" && lined[1] !== ".") {
				const start = Number(lined[2]);
				const end = lined[3] !== void 0 ? Number(lined[3]) : start;
				if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return null;
				return {
					path: lined[1],
					lines: {
						start,
						end
					}
				};
			}
			return { path: body };
		}
		/**
		* Model form: a whole file is `@path`; a selection with a snippet is a
		* fenced block; a line span without a snippet is `@path:lines`.
		*/
		function serializeFileRef(raw) {
			const ref = decodeFileRef(raw);
			if (ref === null) return raw;
			if (ref.selected !== void 0 && ref.selected !== "") return `\`\`\`${headerOf(ref.path, void 0, ref.lines)}\n${ref.selected}\n\`\`\``;
			return fileClipboardText(ref);
		}
		/** The insert-reference payload the input machine mints a chip from. */
		function fileReferenceInsert(ref) {
			return {
				source: FILE_SOURCE,
				ref: encodeFileRef(ref),
				label: fileChipLabel(ref),
				clipboardText: fileClipboardText(ref)
			};
		}
		/**
		* Copy a selection for the composer chip AND for everywhere else:
		* the custom MIME is the chip payload; `text/plain` stays the selected
		* source so paste into chat/email/another editor is the original text.
		* No selected body → leave the event alone (browser default copy).
		*/
		function writeFileRefClipboard(event, ref) {
			const data = event.clipboardData;
			if (data === null) return;
			if (ref.selected === void 0 || ref.selected === "") return;
			event.preventDefault();
			data.setData(FILE_REF_MIME, encodeFileRef(ref));
			data.setData("text/plain", ref.selected);
		}
		//#endregion
		//#region src/client/git-status-style.ts
		/**
		* Shared git-status coloring for the Git panel and the explorer.
		* One letter (index, else worktree) picks the color; directories inherit
		* the strongest color of any descendant change.
		*/
		init_sidebar_module_css();
		const KIND_RANK = {
			conflict: 5,
			untracked: 4,
			mod: 3,
			add: 2,
			del: 1
		};
		/** The XY letter a row badge shows (X = index, Y = worktree). */
		function badgeOf$1(entry) {
			const index = entry.xy[0];
			const worktree = entry.xy[1];
			if (index !== void 0 && index !== " " && index !== "?") return index;
			if (worktree !== void 0 && worktree !== " " && worktree !== "?") return worktree;
			return "?";
		}
		function kindOfBadge(badge) {
			switch (badge) {
				case "A": return "add";
				case "?": return "untracked";
				case "D": return "del";
				case "U": return "conflict";
				case "M":
				case "R":
				case "C":
				case "T": return "mod";
				default: return;
			}
		}
		function kindOfEntry(entry) {
			return kindOfBadge(badgeOf$1(entry));
		}
		function classOfKind(kind) {
			if (kind === "add") return sidebar_module_css_default.gitAdded;
			if (kind === "untracked") return sidebar_module_css_default.gitUntracked;
			if (kind === "del") return sidebar_module_css_default.gitDeleted;
			if (kind === "conflict") return sidebar_module_css_default.gitConflict;
			if (kind === "mod") return sidebar_module_css_default.gitModified;
		}
		function stronger(a, b) {
			if (a === void 0) return b;
			return KIND_RANK[b] > KIND_RANK[a] ? b : a;
		}
		function normalizeAbs(path) {
			return path.replace(/\\/g, "/").replace(/\/+$/, "");
		}
		function joinAbs(root, rel) {
			const base = normalizeAbs(root);
			const rest = rel.replace(/\\/g, "/").replace(/^\/+/, "");
			return rest === "" ? base : `${base}/${rest}`;
		}
		function parentAbs(path) {
			const at = path.lastIndexOf("/");
			if (at <= 0) return void 0;
			return path.slice(0, at);
		}
		/** Absolute-path → status kind, including ancestor directories. */
		function gitKindByPath(status) {
			const map = /* @__PURE__ */ new Map();
			if (status === void 0 || !status.isRepo || status.root === void 0) return map;
			const root = normalizeAbs(status.root);
			for (const entry of status.entries) {
				const kind = kindOfEntry(entry);
				if (kind === void 0) continue;
				const rel = entry.path.replace(/\\/g, "/");
				const abs = joinAbs(root, rel);
				map.set(abs, stronger(map.get(abs), kind));
				map.set(rel, stronger(map.get(rel), kind));
				let dir = parentAbs(abs);
				while (dir !== void 0 && (dir === root || dir.startsWith(`${root}/`))) {
					map.set(dir, stronger(map.get(dir), kind));
					if (dir === root) break;
					dir = parentAbs(dir);
				}
			}
			return map;
		}
		/** Workspace path a tab should color from (editor / worktree / commit file). */
		function workspacePathOfTab(tab) {
			if (tab.type === "editor" && tab.path !== void 0 && tab.path !== "") return tab.path;
			if (tab.type === "diff") {
				if (tab.diff?.kind === "worktree") return tab.diff.path;
				if (tab.diff?.kind === "commit" && tab.diff.path !== void 0 && tab.diff.path !== "") return tab.diff.path;
			}
			return tab.path;
		}
		let lastGitKinds = /* @__PURE__ */ new Map();
		/** Latest git-status map (header decorate reads this between polls). */
		function latestGitKinds() {
			return lastGitKinds;
		}
		/** Live git-status map for coloring explorer rows and file tabs. */
		function useGitKindMap(scope) {
			const [kinds, setKinds] = (0, react.useState)(() => lastGitKinds);
			(0, react.useEffect)(() => {
				if (scope === void 0 || scope.sessionId === "") {
					setKinds(/* @__PURE__ */ new Map());
					return;
				}
				let cancelled = false;
				const load = () => {
					api.gitStatus(scope).then((status) => {
						if (cancelled) return;
						lastGitKinds = gitKindByPath(status);
						setKinds(lastGitKinds);
					}).catch(() => {
						if (cancelled) return;
						lastGitKinds = /* @__PURE__ */ new Map();
						setKinds(lastGitKinds);
					});
				};
				load();
				const timer = window.setInterval(load, 4e3);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [scope?.sessionId, scope?.cwd]);
			return kinds;
		}
		//#endregion
		//#region src/client/explorer/ExplorerView.tsx
		/**
		* The file explorer: a lazy VSCode-style tree rooted at the session's
		* working directory. Levels load on expansion (one API call per directory),
		* directories sort first, hidden entries render dimmed, and the expansion
		* set lives in the per-session state. Clicking a file opens an editor tab.
		*
		* Row actions: hovering a row reveals an @-reference button on the far
		* right (inserts a file chip into the composer), rows are draggable onto
		* the conversation input, and right-click opens a context menu to copy the
		* relative or absolute path (with a brief "copied" label replacing the
		* button after a successful write); file rows also offer a download action
		* (the host serves raw bytes, binary-safe).
		*/
		init_clsx();
		init_dom_sync();
		init_locales();
		init_sidebar_module_css();
		/** Root label: the last path segment (mirror of the host rootLabel). */
		function baseName$2(path) {
			const trimmed = path.replace(/[\\/]+$/, "");
			const at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return at === -1 ? trimmed : trimmed.slice(at + 1);
		}
		/** How long the row's "copied" label stays after a successful write. */
		const COPIED_MS = 1200;
		const FIND_DEBOUNCE_MS = 150;
		function highlightName(name, indices) {
			if (indices.length === 0) return name;
			const marks = new Set(indices);
			const parts = [];
			let buf = "";
			let on = false;
			const flush = (key, mark) => {
				if (buf === "") return;
				parts.push(mark ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("mark", {
					className: sidebar_module_css_default.explorerFindMark,
					children: buf
				}, key) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: buf }, key));
				buf = "";
			};
			for (let i = 0; i < name.length; i += 1) {
				const hit = marks.has(i);
				if (hit !== on) {
					flush(`${i}-${on ? "m" : "t"}`, on);
					on = hit;
				}
				buf += name[i];
			}
			flush("end", on);
			return parts;
		}
		function ExplorerView(props) {
			const { sessionId, cwd, expanded, onToggle, onOpenFile, onOpenFileAbove, onReferenceFile } = props;
			const [data, setData] = (0, react.useState)({});
			const dataRef = (0, react.useRef)(data);
			const [refreshTick, setRefreshTick] = (0, react.useState)(0);
			const [gitKinds, setGitKinds] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			/** The row whose path was just copied ("copied" label replaces its button). */
			const [copiedPath, setCopiedPath] = (0, react.useState)(null);
			/** Open context menu: the row path (and whether it is a directory) plus the cursor position. */
			const [rowMenu, setRowMenu] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [hits, setHits] = (0, react.useState)(null);
			const [findError, setFindError] = (0, react.useState)(null);
			const [finding, setFinding] = (0, react.useState)(false);
			const storeLevel = (0, react.useCallback)((path, level) => {
				dataRef.current = {
					...dataRef.current,
					[path]: level
				};
				setData(dataRef.current);
			}, []);
			const loadDir = (0, react.useCallback)((dir) => {
				if (dataRef.current[dir] !== void 0) return;
				storeLevel(dir, {});
				api.fsTree({
					sessionId,
					cwd
				}, dir).then((listing) => {
					storeLevel(dir, { entries: listing.entries });
				}).catch((error) => {
					storeLevel(dir, { error: error instanceof Error ? error.message : String(error) });
				});
			}, [
				sessionId,
				cwd,
				storeLevel
			]);
			(0, react.useEffect)(() => {
				const q = query.trim();
				if (q === "") {
					setHits(null);
					setFindError(null);
					setFinding(false);
					return;
				}
				let cancelled = false;
				setFinding(true);
				const timer = window.setTimeout(() => {
					api.fsFind({
						sessionId,
						cwd
					}, q).then((result) => {
						if (cancelled) return;
						setHits(result.hits);
						setFindError(null);
					}).catch((error) => {
						if (cancelled) return;
						setHits([]);
						setFindError(error instanceof Error ? error.message : String(error));
					}).finally(() => {
						if (!cancelled) setFinding(false);
					});
				}, FIND_DEBOUNCE_MS);
				return () => {
					cancelled = true;
					window.clearTimeout(timer);
				};
			}, [
				query,
				sessionId,
				cwd
			]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				api.gitStatus({
					sessionId,
					cwd
				}).then((status) => {
					if (!cancelled) setGitKinds(gitKindByPath(status));
				}).catch(() => {
					if (!cancelled) setGitKinds(/* @__PURE__ */ new Map());
				});
				return () => {
					cancelled = true;
				};
			}, [
				sessionId,
				cwd,
				refreshTick
			]);
			(0, react.useEffect)(() => {
				const root = cwd;
				if (root === void 0) return;
				loadDir(root);
				for (const dir of expanded) loadDir(dir);
			}, [
				cwd,
				expanded,
				refreshTick,
				loadDir
			]);
			(0, react.useEffect)(() => {
				const clear = () => {
					setFileDragging(false);
				};
				window.addEventListener("dragend", clear, true);
				window.addEventListener("drop", clear, true);
				window.addEventListener("blur", clear);
				return () => {
					window.removeEventListener("dragend", clear, true);
					window.removeEventListener("drop", clear, true);
					window.removeEventListener("blur", clear);
					clear();
				};
			}, []);
			/** Copy `text`; on success flip the row's copied label for a moment. */
			const copyPath = (0, react.useCallback)((text, path) => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(text).then((ok) => {
					if (!ok) return;
					setCopiedPath(path);
					window.setTimeout(() => {
						setCopiedPath((current) => current === path ? null : current);
					}, COPIED_MS);
				});
			}, []);
			/** The row's trailing actions: the @-reference button, or the copied label. */
			const rowActions = (entry) => {
				if (copiedPath === entry.path) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sidebar_module_css_default.explorerCopied,
					children: t("copied")
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: sidebar_module_css_default.explorerRef,
					"aria-label": t("referenceFile"),
					title: t("referenceFile"),
					onClick: (event) => {
						event.stopPropagation();
						onReferenceFile(entry.path);
					},
					children: t("referenceFile")
				});
			};
			const startFileDrag = (event, path) => {
				const ref = fileRefOf(path, cwd);
				setFileDragging(true);
				event.dataTransfer.setData(FILE_REF_MIME, encodeFileRef(ref));
				event.dataTransfer.setData("text/plain", fileClipboardText(ref));
				event.dataTransfer.effectAllowed = "copy";
			};
			const openRowMenu = (event, path, isDir) => {
				event.preventDefault();
				event.stopPropagation();
				setRowMenu({
					path,
					isDir,
					x: event.clientX,
					y: event.clientY
				});
			};
			/** Download a file through the host route (raw bytes, binary-safe). */
			const downloadFile = (path) => {
				const url = downloadUrl({
					sessionId,
					cwd
				}, path);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.style.display = "none";
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
			};
			const root = cwd;
			const renderLevel = (dir, depth) => {
				const level = data[dir];
				if (level === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.explorerRow,
					style: { paddingLeft: depth * 22 + 6 },
					children: t("loading")
				});
				if (level.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerError),
					style: { paddingLeft: depth * 22 + 6 },
					children: level.error
				});
				return (level.entries ?? []).map((entry) => {
					if (entry.isDir) {
						const isOpen = expanded.includes(entry.path);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "button",
							tabIndex: 0,
							draggable: true,
							className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerDir, entry.hidden && sidebar_module_css_default.explorerHidden),
							style: { paddingLeft: depth * 22 + 6 },
							onDragStart: (event) => {
								startFileDrag(event, entry.path);
							},
							onDragEnd: () => {
								setFileDragging(false);
							},
							onClick: () => {
								onToggle(entry.path);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onToggle(entry.path);
								}
							},
							onContextMenu: (event) => {
								openRowMenu(event, entry.path, true);
							},
							children: [
								isOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 14 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(sidebar_module_css_default.explorerName, classOfKind(gitKinds.get(entry.path))),
									children: entry.name
								}),
								rowActions(entry)
							]
						}), isOpen && renderLevel(entry.path, depth + 1)] }, entry.path);
					}
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "button",
						tabIndex: 0,
						draggable: true,
						className: clsx(sidebar_module_css_default.explorerRow, entry.hidden && sidebar_module_css_default.explorerHidden),
						style: { paddingLeft: depth * 22 + 6 },
						title: entry.path,
						onDragStart: (event) => {
							startFileDrag(event, entry.path);
						},
						onDragEnd: () => {
							setFileDragging(false);
						},
						onClick: () => {
							onOpenFile(entry.path);
						},
						onDoubleClick: (event) => {
							if (onOpenFileAbove === void 0) return;
							event.preventDefault();
							event.stopPropagation();
							onOpenFileAbove(entry.path);
						},
						onKeyDown: (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onOpenFile(entry.path);
							}
						},
						onContextMenu: (event) => {
							openRowMenu(event, entry.path, false);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx(sidebar_module_css_default.explorerName, classOfKind(gitKinds.get(entry.path))),
								children: entry.name
							}),
							rowActions(entry)
						]
					}, entry.path);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.explorer,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.explorerHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.explorerRoot,
							title: root,
							children: root === void 0 ? t("noSession") : baseName$2(root)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("refresh"),
							title: t("refresh"),
							onClick: () => {
								dataRef.current = {};
								setData({});
								setRefreshTick((tick) => tick + 1);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.explorerFind,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: sidebar_module_css_default.explorerFindInput,
							type: "search",
							value: query,
							placeholder: t("findFilePlaceholder"),
							"aria-label": t("findFile"),
							onChange: (event) => {
								setQuery(event.target.value);
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.explorerBody,
						children: root === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.explorerEmpty,
							children: t("noSession")
						}) : query.trim() !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.explorerFindList,
							children: [
								findError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sidebar_module_css_default.explorerError,
									children: findError
								}),
								finding && hits === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sidebar_module_css_default.explorerEmpty,
									children: t("loading")
								}),
								!finding && hits !== null && hits.length === 0 && findError === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sidebar_module_css_default.explorerEmpty,
									children: t("findFileEmpty")
								}),
								hits?.map((hit) => {
									const shown = presentFindHit(hit.rel);
									const fileName = hit.rel.split("/").pop() ?? hit.rel;
									const baseStart = hit.rel.length - fileName.length;
									const nameIndices = hit.indices.filter((index) => index >= baseStart && index < baseStart + shown.name.length).map((index) => index - baseStart);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										role: "button",
										tabIndex: 0,
										className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerFindRow),
										title: hit.rel,
										onClick: () => {
											onOpenFile(hit.path);
										},
										onDoubleClick: (event) => {
											if (onOpenFileAbove === void 0) return;
											event.preventDefault();
											event.stopPropagation();
											onOpenFileAbove(hit.path);
										},
										onKeyDown: (event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												onOpenFile(hit.path);
											}
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.explorerFindName,
												children: highlightName(shown.name, nameIndices)
											}),
											shown.location !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: sidebar_module_css_default.explorerFindLocation,
												children: ["of ", shown.location]
											}),
											shown.module !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.explorerFindModule,
												children: shown.module
											})
										]
									}, hit.path);
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.explorerRow,
							style: { paddingLeft: 6 },
							draggable: true,
							onDragStart: (event) => {
								startFileDrag(event, root);
							},
							onDragEnd: () => {
								setFileDragging(false);
							},
							onContextMenu: (event) => {
								openRowMenu(event, root, true);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(sidebar_module_css_default.explorerName, classOfKind(gitKinds.get(root))),
									children: baseName$2(root)
								}),
								copiedPath === root ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.explorerCopied,
									children: t("copied")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.explorerRef,
									"aria-label": t("referenceFile"),
									title: t("referenceFile"),
									onClick: (event) => {
										event.stopPropagation();
										onReferenceFile(root);
									},
									children: t("referenceFile")
								})
							]
						}), data[root] !== void 0 && renderLevel(root, 1)] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: rowMenu !== null,
						onClose: () => {
							setRowMenu(null);
						},
						items: [
							...rowMenu?.isDir === false ? [{
								id: "download",
								label: t("download"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 14 })
							}] : [],
							{
								id: "relative",
								label: t("copyRelative"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							{
								id: "absolute",
								label: t("copyAbsolute"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							}
						],
						onSelect: (id) => {
							const target = rowMenu;
							if (target === null) return;
							setRowMenu(null);
							if (id === "download") {
								downloadFile(target.path);
								return;
							}
							copyPath(id === "relative" ? relativeTo(cwd ?? "", target.path) : target.path, target.path);
						},
						portal: true,
						align: "start",
						getAnchorRect: () => rowMenu === null ? null : new DOMRect(rowMenu.x, rowMenu.y, 0, 0),
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
					})
				]
			});
		}
		//#endregion
		//#region src/client/binary-download.tsx
		init_locales();
		init_sidebar_module_css();
		function BinaryDownload(props) {
			const { scope, path } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorBinary,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sidebar_module_css_default.editorBinaryNotice,
					children: t("binaryNoPreview")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					className: sidebar_module_css_default.editorDownloadLink,
					href: downloadUrl(scope, path),
					download: true,
					children: t("downloadToView")
				})]
			});
		}
		//#endregion
		//#region src/client/editor-load.ts
		/** Decode the host's base64 head bytes into the sniffing buffer. */
		function decodeHead(headBase64) {
			const binary = atob(headBase64);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
			return bytes;
		}
		/**
		* Dispatch one matched viewer's fetchStrategy. A missing viewer or a
		* `binary-download` strategy both mean "no client-side renderer" → the
		* download UI. `mediaUrlOf` builds the media URL for `mediaUrl`/`none`
		* strategies (pure, but scope-bound — injected by the host).
		*/
		function planFirstMatch(viewer, mediaUrlOf) {
			if (viewer === void 0 || viewer.fetchStrategy === "binary-download") return { kind: "binary" };
			switch (viewer.fetchStrategy) {
				case "mediaUrl":
				case "none": return {
					kind: "render",
					viewer,
					mediaUrl: mediaUrlOf()
				};
				case "custom": return {
					kind: "customLoad",
					viewer
				};
				case "fsRead": return {
					kind: "fetchFsRead",
					viewer
				};
			}
		}
		/**
		* Decide what an fsRead result means for the editor.
		* - Text: the first match stands (content is valid for any fsRead viewer).
		* - Binary: the host head bytes enable a re-match — a `detect` viewer (e.g.
		*   a plugin sniffing a binary format) may claim the file. `custom` viewers
		*   load their own bytes; `mediaUrl`/`none` viewers render the media route;
		*   an fsRead viewer or nothing cannot render binary → download UI.
		*/
		function planFsReadOutcome(viewer, result, rematch, mediaUrlOf) {
			if (!result.binary) return {
				kind: "render",
				viewer,
				content: result.content,
				truncated: result.truncated
			};
			const claimed = result.head === void 0 ? void 0 : rematch(decodeHead(result.head));
			if (claimed !== void 0 && claimed.fetchStrategy === "custom") return {
				kind: "customLoad",
				viewer: claimed
			};
			if (claimed !== void 0 && (claimed.fetchStrategy === "mediaUrl" || claimed.fetchStrategy === "none")) return {
				kind: "render",
				viewer: claimed,
				mediaUrl: mediaUrlOf()
			};
			return { kind: "binary" };
		}
		//#endregion
		//#region src/client/review/review-model.ts
		/**
		* Session-scoped agent edits: files the current conversation actually
		* wrote (diff / edit / delete tool cards). Reads and failed tools stay
		* out. The review list is one row per (turn, path); file-level undo
		* still uses the first snapshot of each path.
		*/
		function addedPaths(view) {
			const added = /* @__PURE__ */ new Set();
			if (view === null || typeof view !== "object") return added;
			const diffs = view.diffs;
			if (!Array.isArray(diffs)) return added;
			for (const diff of diffs) {
				if (diff === null || typeof diff !== "object") continue;
				const record = diff;
				if (typeof record.path === "string" && record.oldText === null) added.add(record.path);
			}
			return added;
		}
		/** Paths a tool-result view reports as an agent mutation. */
		function reviewLocations(view) {
			if (view === null || typeof view !== "object") return [];
			const record = view;
			const deleted = record.card === "generic" && record.kind === "delete";
			const edited = record.card === "diff" || record.card === "generic" && record.kind === "edit";
			if (!deleted && !edited) return [];
			const created = addedPaths(view);
			const out = [];
			const push = (path, kind) => {
				out.push({
					path,
					kind
				});
			};
			if (Array.isArray(record.locations)) {
				for (const location of record.locations) if (location !== null && typeof location === "object" && typeof location.path === "string") {
					const path = location.path;
					push(path, deleted ? "delete" : created.has(path) ? "add" : "edit");
				}
			}
			if (out.length === 0 && Array.isArray(record.diffs)) {
				for (const diff of record.diffs) if (diff !== null && typeof diff === "object" && typeof diff.path === "string") {
					const path = diff.path;
					push(path, created.has(path) ? "add" : "edit");
				}
			}
			return out;
		}
		/** Last tool card's old-file snapshot for this path (`null` = created). */
		function oldTextOf(view, path) {
			if (view === null || typeof view !== "object") return void 0;
			const diffs = view.diffs;
			if (!Array.isArray(diffs)) return void 0;
			for (const diff of diffs) {
				if (diff === null || typeof diff !== "object") continue;
				const record = diff;
				if (record.path !== path) continue;
				if (record.oldText === null) return null;
				if (typeof record.oldText === "string") return record.oldText;
			}
		}
		function textFromBlocks(blocks) {
			if (!Array.isArray(blocks)) return "";
			const texts = [];
			for (const block of blocks) {
				if (typeof block === "string") {
					texts.push(block);
					continue;
				}
				if (block === null || typeof block !== "object") continue;
				const record = block;
				if (typeof record.text === "string" && (record.type === void 0 || record.type === "text")) texts.push(record.text);
			}
			return texts.join("\n");
		}
		function promptOf(node) {
			if (node === null || typeof node !== "object") return "";
			const record = node;
			if (typeof record.text === "string") return record.text;
			if (typeof record.content === "string") return record.content;
			const fromContent = textFromBlocks(record.content);
			if (fromContent !== "") return fromContent;
			return textFromBlocks(record.parts);
		}
		/**
		* Flatten conversation nodes into one row per (turn, path). The same file
		* written in several turns shows up under each turn. File-level undo still
		* uses {@link latestSessionEdits} so the first snapshot wins.
		*/
		function collectSessionEdits(nodes, cwd) {
			const byKey = /* @__PURE__ */ new Map();
			const order = [];
			let turn;
			let prompt = "";
			let seq;
			for (const node of nodes) {
				if (node === null || typeof node !== "object") continue;
				const record = node;
				if (record.kind === "user" || record.kind === "steering") {
					const next = promptOf(node).trim();
					if (next !== "") prompt = next;
					continue;
				}
				if (typeof record.turn === "number") turn = record.turn;
				if (typeof record.seq === "number") seq = record.seq;
				const time = typeof record.time === "number" && Number.isFinite(record.time) ? record.time : void 0;
				if (record.kind !== "tool-result" || record.isError === true) continue;
				for (const location of reviewLocations(record.callView)) {
					const path = resolveSidebarPath(cwd, location.path);
					const oldText = oldTextOf(record.callView, location.path);
					const key = `${turn ?? "x"}\n${path}`;
					const existing = byKey.get(key);
					if (existing === void 0) {
						order.push(key);
						byKey.set(key, {
							path,
							kind: location.kind,
							turn,
							seq,
							prompt,
							time,
							oldText
						});
					} else {
						existing.kind = location.kind;
						existing.seq = seq;
						if (prompt !== "") existing.prompt = prompt;
						if (time !== void 0) existing.time = time;
						if (oldText !== void 0) existing.oldText = oldText;
						if (existing.oldText === null) existing.kind = "add";
					}
				}
			}
			return order.map((key) => byKey.get(key)).filter((row) => row !== void 0);
		}
		/** Last write of each path; first `oldText` is kept for file-level undo. */
		function latestSessionEdits(edits) {
			const byPath = /* @__PURE__ */ new Map();
			const order = [];
			for (const edit of edits) {
				const existing = byPath.get(edit.path);
				if (existing === void 0) {
					order.push(edit.path);
					byPath.set(edit.path, { ...edit });
					continue;
				}
				const firstOld = existing.oldText;
				existing.kind = edit.kind;
				existing.turn = edit.turn;
				existing.seq = edit.seq;
				if (edit.prompt !== "") existing.prompt = edit.prompt;
				existing.oldText = firstOld !== void 0 ? firstOld : edit.oldText;
				if (existing.oldText === null) existing.kind = "add";
			}
			return order.map((path) => byPath.get(path)).filter((row) => row !== void 0);
		}
		/** One-line prompt preview for the review list (Cursor-style). */
		function promptPreview(prompt, max = 72) {
			const compact = prompt.replace(/\s+/g, " ").trim();
			if (compact.length <= max) return compact;
			return `${compact.slice(0, Math.max(0, max - 1))}…`;
		}
		/** Group first-seen edits by the conversation turn that last wrote them. Newest turn first. */
		function groupEditsByTurn(edits) {
			const groups = [];
			const index = /* @__PURE__ */ new Map();
			for (const edit of edits) {
				const key = `${edit.turn ?? "x"}\n${edit.prompt}`;
				let group = index.get(key);
				if (group === void 0) {
					group = {
						key,
						turn: edit.turn,
						prompt: edit.prompt,
						time: edit.time,
						edits: []
					};
					index.set(key, group);
					groups.push(group);
				}
				if (group.time === void 0 && edit.time !== void 0) group.time = edit.time;
				group.edits.push(edit);
			}
			return groups.sort((a, b) => (b.turn ?? -1) - (a.turn ?? -1));
		}
		//#endregion
		//#region src/client/git-repo.ts
		/**
		* Pick the innermost git work tree that owns a file, then the path git
		* commands expect (repo-relative). File-level and hunk review share this
		* so `git show HEAD:…` never gets an absolute path.
		*/
		function relPathOf(root, file) {
			const base = root.replace(/\\/g, "/").replace(/\/+$/, "");
			const abs = file.replace(/\\/g, "/");
			if (abs === base) return void 0;
			if (abs.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return abs.slice(base.length + 1);
		}
		function repoRootOf(file, roots) {
			const abs = file.replace(/\\/g, "/");
			return [...roots].map((root) => root.replace(/\\/g, "/").replace(/\/+$/, "")).filter((root) => abs === root || abs.startsWith(`${root}/`)).sort((a, b) => b.length - a.length)[0];
		}
		async function gitFileTarget(scope, path) {
			const nested = repoRootOf(path, (await api.gitRepos(scope).catch(() => ({ repos: [] }))).repos.map((repo) => repo.root));
			if (nested === void 0) {
				const status = await api.gitStatus(scope).catch(() => ({
					isRepo: false,
					root: void 0
				}));
				const root = status.isRepo ? status.root : void 0;
				const rel = root === void 0 ? void 0 : relPathOf(root, path);
				return {
					scope: root === void 0 ? scope : {
						...scope,
						repo: root
					},
					gitPath: rel ?? path,
					root
				};
			}
			return {
				scope: {
					...scope,
					repo: nested
				},
				gitPath: relPathOf(nested, path) ?? path,
				root: nested
			};
		}
		//#endregion
		//#region src/review/review-document.ts
		function emptyReviewDocument() {
			return {
				decisions: {},
				seen: {},
				hunks: {}
			};
		}
		function decisionMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [path, decision] of Object.entries(value)) if (decision === "kept" || decision === "undone") out[path] = decision;
			return out;
		}
		function seenMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [path, seen] of Object.entries(value)) if (typeof seen === "string" && seen !== "") out[path] = seen;
			return out;
		}
		function parseReviewDocument(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return emptyReviewDocument();
			const record = value;
			const touchedAt = typeof record.touchedAt === "number" && Number.isFinite(record.touchedAt) ? record.touchedAt : void 0;
			return {
				decisions: decisionMapOf(record.decisions),
				seen: seenMapOf(record.seen),
				hunks: decisionMapOf(record.hunks),
				...touchedAt !== void 0 ? { touchedAt } : {}
			};
		}
		function reviewDocumentIsEmpty(doc) {
			return Object.keys(doc.decisions).length === 0 && Object.keys(doc.hunks).length === 0;
		}
		function isRelativeReviewPath(path) {
			return !path.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(path);
		}
		/** True when two ledger keys are the same file (cwd turned a relative path absolute). */
		function sameReviewPath(a, b) {
			const left = a.replace(/\\/g, "/");
			const right = b.replace(/\\/g, "/");
			if (left === right) return true;
			if (isRelativeReviewPath(left) && right.endsWith(`/${left}`)) return true;
			if (isRelativeReviewPath(right) && left.endsWith(`/${right}`)) return true;
			return false;
		}
		/** Existing map key for this file, if the ledger stored a relative or absolute alias. */
		function reviewPathKeyOf(map, path) {
			if (Object.prototype.hasOwnProperty.call(map, path)) return path;
			for (const key of Object.keys(map)) if (sameReviewPath(key, path)) return key;
		}
		//#endregion
		//#region src/client/review/review-store.ts
		/**
		* Keep / undo decisions for agent-produced files. The file on disk already
		* has the agent's write; Keep only records that the user accepted it. Undo
		* restores HEAD (or deletes a new file) and records that too. A later
		* agent write of the same path drops the decision so the row is pending
		* again.
		*
		* The ledger lives in the session directory via the plugin host
		* (`review.json`). Memory is the read cache; private-mode browsers still
		* persist because the write goes through `/sidebar/api`. A one-shot
		* localStorage copy is migrated when the disk file is still empty.
		*/
		const PREFIX = "dsh-sidebar:review:v1:";
		const listeners$1 = /* @__PURE__ */ new Set();
		let revision = 0;
		const cache = /* @__PURE__ */ new Map();
		const cwdBySession = /* @__PURE__ */ new Map();
		const hydrating = /* @__PURE__ */ new Set();
		const ready = /* @__PURE__ */ new Set();
		/** Cheap snapshot for `useSyncExternalStore`. */
		function reviewRevision() {
			return revision;
		}
		/** Subscribe to keep / undo writes (review list + editor bar). */
		function subscribeReview(listener) {
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
			};
		}
		function notify() {
			revision += 1;
			for (const listener of listeners$1) listener();
		}
		function fingerprintOf(edit) {
			return `${edit.seq ?? ""}:${edit.turn ?? ""}:${edit.kind}`;
		}
		/**
		* True when `edit` is a later agent write than the Keep / Undo we recorded.
		* Only a higher turn (or, if turns are missing, a higher seq) reopens the
		* row. Incomplete hydration (`turn`/`seq` appearing or disappearing) must
		* not dump an already-accepted file back into Pending.
		*/
		function isNewerWrite(edit, seen) {
			const parts = seen.split(":");
			const seenSeq = parts[0] !== "" ? Number(parts[0]) : NaN;
			const seenTurn = parts.length >= 2 && parts[1] !== "" ? Number(parts[1]) : NaN;
			if (typeof edit.turn === "number" && Number.isFinite(seenTurn)) return edit.turn > seenTurn;
			if (typeof edit.seq === "number" && Number.isFinite(seenSeq)) return edit.seq > seenSeq;
			return false;
		}
		function hunkKeyOf(path, hunkKey) {
			return `${path}\t${hunkKey}`;
		}
		function cloneDoc(doc) {
			return {
				decisions: { ...doc.decisions },
				seen: { ...doc.seen },
				hunks: { ...doc.hunks },
				...doc.touchedAt !== void 0 ? { touchedAt: doc.touchedAt } : {}
			};
		}
		function readLegacy(sessionId) {
			if (typeof localStorage === "undefined") return emptyReviewDocument();
			try {
				const raw = localStorage.getItem(`${PREFIX}${sessionId}`);
				if (raw === null || raw === "") return emptyReviewDocument();
				return parseReviewDocument(JSON.parse(raw));
			} catch {
				return emptyReviewDocument();
			}
		}
		function clearLegacy(sessionId) {
			if (typeof localStorage === "undefined") return;
			try {
				localStorage.removeItem(`${PREFIX}${sessionId}`);
			} catch {}
		}
		/** Disk wins unless it is empty or older than an in-memory / leftover browser copy. */
		function pickReviewDocument(remote, local) {
			if (reviewDocumentIsEmpty(local)) return {
				document: cloneDoc(remote),
				migrate: false
			};
			if (reviewDocumentIsEmpty(remote)) return {
				document: cloneDoc(local),
				migrate: true
			};
			if ((local.touchedAt ?? 0) > (remote.touchedAt ?? 0)) return {
				document: cloneDoc(local),
				migrate: true
			};
			return {
				document: cloneDoc(remote),
				migrate: false
			};
		}
		function readDoc(sessionId) {
			const cached = cache.get(sessionId);
			if (cached !== void 0) return cached;
			const legacy = readLegacy(sessionId);
			cache.set(sessionId, cloneDoc(legacy));
			return cache.get(sessionId);
		}
		function persist(sessionId, doc) {
			const cwd = cwdBySession.get(sessionId);
			api.reviewPut({
				sessionId,
				cwd
			}, doc).catch((error) => {
				console.warn("[dsh-better-sidebar] review ledger write failed:", error);
			});
		}
		function writeDoc(sessionId, doc) {
			cache.set(sessionId, doc);
			persist(sessionId, doc);
			notify();
		}
		function rememberReviewScope(scope) {
			cwdBySession.set(scope.sessionId, scope.cwd);
		}
		/** Load the session-directory ledger (and migrate a leftover browser copy). */
		async function hydrateReview(scope) {
			rememberReviewScope(scope);
			if (ready.has(scope.sessionId) || hydrating.has(scope.sessionId)) return;
			hydrating.add(scope.sessionId);
			try {
				const picked = pickReviewDocument(await api.reviewGet(scope), cache.get(scope.sessionId) ?? readLegacy(scope.sessionId));
				cache.set(scope.sessionId, picked.document);
				if (picked.migrate) await api.reviewPut(scope, picked.document);
				if (picked.migrate || !reviewDocumentIsEmpty(picked.document)) clearLegacy(scope.sessionId);
				ready.add(scope.sessionId);
				notify();
			} catch (error) {
				console.warn("[dsh-better-sidebar] review ledger read failed:", error);
			} finally {
				hydrating.delete(scope.sessionId);
			}
		}
		function ledgerKeyOf(doc, path) {
			return reviewPathKeyOf(doc.decisions, path) ?? reviewPathKeyOf(doc.seen, path) ?? path;
		}
		function forgetPath(doc, path) {
			delete doc.decisions[path];
			delete doc.seen[path];
		}
		function decisionOf(sessionId, path, edit) {
			const doc = readDoc(sessionId);
			const key = ledgerKeyOf(doc, path);
			const seen = doc.seen[key];
			if (edit !== void 0 && seen !== void 0 && isNewerWrite(edit, seen)) return void 0;
			return doc.decisions[key];
		}
		function setReviewDecision(sessionId, path, decision, edit) {
			const doc = cloneDoc(readDoc(sessionId));
			const previous = ledgerKeyOf(doc, path);
			if (previous !== path) forgetPath(doc, previous);
			if (decision === void 0) forgetPath(doc, path);
			else {
				doc.decisions[path] = decision;
				if (edit !== void 0) doc.seen[path] = fingerprintOf(edit);
				else if (doc.seen[previous] !== void 0) doc.seen[path] = doc.seen[previous];
				doc.touchedAt = Date.now();
			}
			writeDoc(sessionId, doc);
		}
		function setHunkDecision(sessionId, path, hunkKey, decision) {
			const doc = cloneDoc(readDoc(sessionId));
			const key = hunkKeyOf(path, hunkKey);
			if (decision === void 0) delete doc.hunks[key];
			else doc.hunks[key] = decision;
			writeDoc(sessionId, doc);
		}
		function pendingCount(sessionId, edits) {
			let count = 0;
			for (const edit of edits) if (decisionOf(sessionId, edit.path, edit) === void 0) count += 1;
			return count;
		}
		//#endregion
		//#region src/client/review/review-history.ts
		const undoByFile = /* @__PURE__ */ new Map();
		const redoByFile = /* @__PURE__ */ new Map();
		function reviewFileKey(sessionId, path) {
			return `${sessionId}\n${path}`;
		}
		function stackOf(map, key) {
			let stack = map.get(key);
			if (stack === void 0) {
				stack = [];
				map.set(key, stack);
			}
			return stack;
		}
		function pushReviewRevert(entry) {
			const key = reviewFileKey(entry.sessionId, entry.path);
			stackOf(undoByFile, key).push(entry);
			redoByFile.delete(key);
		}
		function peekReviewUndo(sessionId, path) {
			const stack = undoByFile.get(reviewFileKey(sessionId, path));
			return stack?.[stack.length - 1];
		}
		function peekReviewRedo(sessionId, path) {
			const stack = redoByFile.get(reviewFileKey(sessionId, path));
			return stack?.[stack.length - 1];
		}
		function canRevertReview(sessionId, path, direction) {
			return (direction === "undo" ? peekReviewUndo(sessionId, path) : peekReviewRedo(sessionId, path)) !== void 0;
		}
		function popReviewUndo(sessionId, path) {
			const key = reviewFileKey(sessionId, path);
			const entry = undoByFile.get(key)?.pop();
			if (entry === void 0) return void 0;
			stackOf(redoByFile, key).push(entry);
			return entry;
		}
		function popReviewRedo(sessionId, path) {
			const key = reviewFileKey(sessionId, path);
			const entry = redoByFile.get(key)?.pop();
			if (entry === void 0) return void 0;
			stackOf(undoByFile, key).push(entry);
			return entry;
		}
		function applyReviewDecision(entry, decision) {
			if (entry.kind === "keep" || entry.kind === "undo") {
				setHunkDecision(entry.sessionId, entry.path, entry.hunkKey, decision);
				return;
			}
			setReviewDecision(entry.sessionId, entry.path, decision, entry.edit);
		}
		function contentAfterRevert(entry, direction) {
			if (entry.kind === "file-undo") return direction === "undo" ? entry.previous : entry.next;
			if (entry.kind === "undo") return direction === "undo" ? entry.previous : entry.next;
		}
		//#endregion
		//#region src/client/conversation-input.ts
		function sessionInput(ctx, sessionId) {
			const actx = ctx.sessions.scope(sessionId);
			if (actx === void 0) return void 0;
			const conversation = ctx.get("conversation");
			if (conversation === void 0) return void 0;
			return conversation.input.for(actx);
		}
		var init_conversation_input = __esmMin((() => {}));
		//#endregion
		//#region src/client/composer-chip-caret.ts
		var composer_chip_caret_exports = /* @__PURE__ */ __exportAll({
			caretAfterChip: () => caretAfterChip,
			caretHitsChip: () => caretHitsChip,
			chipSpanAt: () => chipSpanAt,
			composerTextarea: () => composerTextarea,
			draftAfterChipDelete: () => draftAfterChipDelete,
			occurrenceChipLength: () => occurrenceChipLength,
			padSpacesAfterObject: () => padSpacesAfterObject,
			padSpacesAfterObjects: () => padSpacesAfterObjects,
			placeComposerCaretAfterChips: () => placeComposerCaretAfterChips,
			registerComposerChipCaret: () => registerComposerChipCaret,
			snapComposerCaretOffChip: () => snapComposerCaretOffChip
		});
		function composerTextarea() {
			return document.querySelector("[data-composer-card] textarea");
		}
		/** Glyph count of one occurrence in the draft (`1` for U+FFFC, `@label`.length otherwise). */
		function occurrenceChipLength(draft, occurrence) {
			if (typeof occurrence.length === "number" && occurrence.length > 0) return occurrence.length;
			if (draft[occurrence.offset] === OBJECT) return 1;
			if (occurrence.label !== void 0 && occurrence.label !== "") {
				const text = `@${occurrence.label}`;
				if (draft.startsWith(text, occurrence.offset)) return text.length;
			}
			return 1;
		}
		function chipGlyphLength(draft, offset, length) {
			if (length !== void 0 && length > 0) return length;
			return draft[offset] === OBJECT ? 1 : 0;
		}
		function isChipStart(draft, index) {
			return draft[index] === OBJECT || draft[index] === "@";
		}
		function chipStartAt(draft, caret, length) {
			if (length !== void 0 && length > 0) {
				let probe = caret;
				while (probe > 0 && draft[probe - 1] === " ") probe -= 1;
				const afterSpaces = probe - length;
				if (afterSpaces >= 0 && probe === afterSpaces + length && isChipStart(draft, afterSpaces)) return afterSpaces;
				const from = Math.max(0, caret - length + 1);
				for (let start = from; start <= caret; start += 1) if (isChipStart(draft, start) && caret <= start + length) return start;
				return null;
			}
			if (draft[caret] === OBJECT) return caret;
			if (caret > 0 && draft[caret - 1] === OBJECT) return caret - 1;
			let i = caret - 1;
			while (i >= 0 && draft[i] === " ") i -= 1;
			if (i >= 0 && draft[i] === OBJECT) return i;
			return null;
		}
		/** Insert spaces after a chip so the textarea caret can sit past the visible pill. */
		function padSpacesAfterObject(draft, objectOffset, minSpaces, length) {
			const spanLen = chipGlyphLength(draft, objectOffset, length);
			if (spanLen <= 0 || minSpaces <= 0) return draft;
			let i = objectOffset + spanLen;
			let have = 0;
			while (draft[i] === " ") {
				have += 1;
				i += 1;
			}
			if (have >= minSpaces) return draft;
			return `${draft.slice(0, i)}${" ".repeat(minSpaces - have)}${draft.slice(i)}`;
		}
		function padSpacesAfterObjects(draft, pads) {
			let next = draft;
			for (const pad of [...pads].sort((a, b) => b.offset - a.offset)) next = padSpacesAfterObject(next, pad.offset, pad.minSpaces, pad.length);
			return next;
		}
		/** Offset just after a chip at `offset` and any spaces the host left behind it. */
		function caretAfterChip(draft, offset, length) {
			const start = chipStartAt(draft, offset, length);
			if (start === null) return offset;
			let at = start + (chipGlyphLength(draft, start, length) || 1);
			while (draft[at] === " ") at += 1;
			return at;
		}
		function caretHitsChip(draft, offset, length) {
			const span = chipSpanAt(draft, offset, length);
			if (span === null || offset < span.start) return false;
			if (offset < span.end) return true;
			return offset === span.end && draft[offset] === void 0;
		}
		/** Chip placeholder plus its host padding, if `object` is a chip start. */
		function chipSpanFrom(draft, object, length) {
			if (!isChipStart(draft, object)) return null;
			const spanLen = chipGlyphLength(draft, object, length);
			if (spanLen <= 0) return null;
			let end = object + spanLen;
			while (draft[end] === " ") end += 1;
			return {
				start: object,
				end
			};
		}
		/** Span of the chip the caret is on, or the chip that ends at the caret. */
		function chipSpanAt(draft, offset, length) {
			const start = chipStartAt(draft, offset, length);
			if (start === null) return null;
			const span = chipSpanFrom(draft, start, length);
			if (span !== null && offset <= span.end) return span;
			return null;
		}
		/**
		* Backspace after a chip / Delete on a chip removes the placeholder and
		* its padding in one stroke. Returns null when the caret is not on a chip.
		*/
		function draftAfterChipDelete(draft, caret, direction, length) {
			const span = direction === "backward" ? chipSpanAt(draft, caret, length) : chipSpanFrom(draft, caret, length) ?? chipSpanAt(draft, caret, length);
			if (span === null) return null;
			if (direction === "backward" && caret < span.start) return null;
			if (direction === "forward" && caret >= span.end) return null;
			return {
				draft: `${draft.slice(0, span.start)}${draft.slice(span.end)}`,
				caret: span.start
			};
		}
		function coveringChipLength(draft, caret, occurrences) {
			if (occurrences !== void 0) for (const occurrence of occurrences) {
				const length = occurrenceChipLength(draft, occurrence);
				const span = chipSpanFrom(draft, occurrence.offset, length);
				if (span !== null && caret >= span.start && caret <= span.end) return length;
			}
			return draft[caret] === OBJECT || caret > 0 && draft[caret - 1] === OBJECT ? 1 : void 0;
		}
		function snapComposerCaretOffChip(el, occurrences) {
			const start = el.selectionStart ?? 0;
			if (start !== (el.selectionEnd ?? start)) return false;
			const length = coveringChipLength(el.value, start, occurrences);
			const next = caretAfterChip(el.value, start, length);
			if (next === start) return false;
			el.setSelectionRange(next, next);
			return true;
		}
		/** After minting a chip, put the caret past the chip the caret is on (or the last one). */
		function placeComposerCaretAfterChips(occurrences) {
			const el = composerTextarea();
			if (el === null) return;
			el.focus({ preventScroll: true });
			if (snapComposerCaretOffChip(el, occurrences)) return;
			const draft = el.value;
			if (occurrences !== void 0 && occurrences.length > 0) {
				const last = [...occurrences].sort((a, b) => b.offset - a.offset)[0];
				const caret = caretAfterChip(draft, last.offset, occurrenceChipLength(draft, last));
				el.setSelectionRange(caret, caret);
				return;
			}
			const last = draft.lastIndexOf(OBJECT);
			if (last === -1) return;
			const caret = caretAfterChip(draft, last);
			el.setSelectionRange(caret, caret);
		}
		function overComposerInput(target) {
			return target instanceof HTMLTextAreaElement && target.closest("[data-composer-card]") !== null;
		}
		function shouldSnapKey(event) {
			if (event.metaKey || event.ctrlKey || event.altKey) return false;
			if (event.isComposing || event.keyCode === 229) return true;
			if (event.key.length === 1) return true;
			return event.key === "Enter" || event.key === "Process";
		}
		function liveOccurrences(ctx) {
			const sessionId = ctx.sessions.list.getSnapshot().current;
			if (sessionId === void 0) return void 0;
			return sessionInput(ctx, sessionId)?.state.getSnapshot().occurrences;
		}
		function deleteChipUnderCaret(ctx, el, direction) {
			const start = el.selectionStart ?? 0;
			if (start !== (el.selectionEnd ?? start)) return false;
			const occurrences = liveOccurrences(ctx);
			const length = coveringChipLength(el.value, start, occurrences);
			const next = draftAfterChipDelete(el.value, start, direction, length);
			if (next === null) return false;
			const sessionId = ctx.sessions.list.getSnapshot().current;
			if (sessionId === void 0) return false;
			const input = sessionInput(ctx, sessionId);
			if (input === void 0) return false;
			input.setDraft(next.draft);
			requestAnimationFrame(() => {
				const box = composerTextarea();
				if (box === null) return;
				box.focus({ preventScroll: true });
				box.setSelectionRange(next.caret, next.caret);
			});
			return true;
		}
		/** Keep typing after a file chip instead of rewriting its placeholder / gap. */
		function registerComposerChipCaret(ctx) {
			const snap = (event) => {
				if (!overComposerInput(event.target)) return;
				snapComposerCaretOffChip(event.target, liveOccurrences(ctx));
			};
			const onKey = (event) => {
				if (!overComposerInput(event.target)) return;
				if ((event.key === "Backspace" || event.key === "Delete") && !event.metaKey && !event.ctrlKey && !event.altKey) {
					const direction = event.key === "Backspace" ? "backward" : "forward";
					if (deleteChipUnderCaret(ctx, event.target, direction)) {
						event.preventDefault();
						event.stopPropagation();
					}
					return;
				}
				if (!shouldSnapKey(event)) return;
				snap(event);
			};
			const onBeforeInput = (event) => {
				if (!event.inputType.startsWith("insert")) return;
				snap(event);
			};
			document.addEventListener("keydown", onKey, true);
			document.addEventListener("beforeinput", onBeforeInput, true);
			document.addEventListener("compositionstart", snap, true);
			return () => {
				document.removeEventListener("keydown", onKey, true);
				document.removeEventListener("beforeinput", onBeforeInput, true);
				document.removeEventListener("compositionstart", snap, true);
			};
		}
		var OBJECT;
		var init_composer_chip_caret = __esmMin((() => {
			init_conversation_input();
			OBJECT = "￼";
		}));
		//#endregion
		//#region src/client/conversation-draft.ts
		init_conversation_input();
		function placeCaret(occurrences) {
			Promise.resolve().then(() => (init_composer_chip_caret(), composer_chip_caret_exports)).then(({ placeComposerCaretAfterChips }) => {
				placeComposerCaretAfterChips(occurrences);
			});
		}
		/**
		* Append `text` to the session's composer draft (space-separated, like the
		* @-mentions). Returns false — and logs — when the conversation service or
		* the session scope is unavailable.
		*/
		function appendToDraft(ctx, sessionId, text) {
			try {
				const input = sessionInput(ctx, sessionId);
				if (input === void 0) return false;
				const draft = input.state.getSnapshot().draft;
				input.setDraft(draft.trim() === "" ? text : `${draft} ${text}`);
				return true;
			} catch (error) {
				console.warn("[dsh-better-sidebar] draft insert failed:", error);
				return false;
			}
		}
		/**
		* Append a file / selection chip (Cursor-style label). Falls back to the
		* `@path:lines` clipboard projection when the facade has no insertReference.
		*/
		function insertFileRef(ctx, sessionId, ref) {
			try {
				if (isPlainTextSelection(ref) && ref.selected !== void 0) return appendToDraft(ctx, sessionId, ref.selected);
				const input = sessionInput(ctx, sessionId);
				if (input === void 0) return false;
				let snapshot = input.state.getSnapshot();
				if (snapshot.draft !== "" && !/\s$/.test(snapshot.draft)) {
					input.setDraft(`${snapshot.draft} `);
					snapshot = input.state.getSnapshot();
				}
				const start = snapshot.draft.length;
				if (typeof input.insertReference === "function" && typeof snapshot.draftRev === "number") {
					if (input.insertReference(fileReferenceInsert(ref), {
						start,
						end: start,
						draftRev: snapshot.draftRev
					})) {
						requestAnimationFrame(() => {
							placeCaret(input.state.getSnapshot().occurrences);
						});
						return true;
					}
				}
				const text = fileClipboardText(ref);
				const draft = snapshot.draft;
				input.setDraft(draft.trim() === "" ? text : `${draft}${/\s$/.test(draft) ? "" : " "}${text}`);
				requestAnimationFrame(() => {
					placeCaret(input.state.getSnapshot().occurrences);
				});
				return true;
			} catch (error) {
				console.warn("[dsh-better-sidebar] file chip insert failed:", error);
				return false;
			}
		}
		//#endregion
		//#region src/client/SelectionQuote.tsx
		/**
		* Floating "add to conversation" button for a DOM text selection. Shared by
		* the markdown preview and the git diff surface: mouse-up inside `host`
		* anchors the popup; click inserts a file chip (Cursor-style label). Copy
		* from the same selection writes the chip payload so paste into the
		* composer upgrades to a chip instead of dumping the code.
		*/
		init_locales();
		init_sidebar_module_css();
		function SelectionQuote(props) {
			const { ctx, sessionId, cwd, host, locate } = props;
			const [popup, setPopup] = (0, react.useState)(null);
			const popupRef = (0, react.useRef)(null);
			const hide = () => {
				popupRef.current = null;
				setPopup(null);
			};
			(0, react.useEffect)(() => {
				if (host === null) return;
				const onMouseUp = () => {
					const sel = window.getSelection();
					if (sel === null || sel.isCollapsed || sel.anchorNode === null || sel.focusNode === null) {
						hide();
						return;
					}
					if (!host.contains(sel.anchorNode) || !host.contains(sel.focusNode)) {
						hide();
						return;
					}
					const text = sel.toString();
					if (text.trim() === "") {
						hide();
						return;
					}
					const located = locate(host, text);
					const rect = sel.getRangeAt(0).getBoundingClientRect();
					const next = {
						ref: fileRefOf(located.path, cwd, located.lines, text),
						left: Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80),
						top: rect.top
					};
					popupRef.current = next;
					setPopup(next);
				};
				const onCopy = (event) => {
					const current = popupRef.current;
					if (current === null) return;
					writeFileRefClipboard(event, current.ref);
				};
				const onScroll = () => {
					hide();
				};
				host.addEventListener("mouseup", onMouseUp);
				host.addEventListener("copy", onCopy);
				host.addEventListener("scroll", onScroll, true);
				return () => {
					host.removeEventListener("mouseup", onMouseUp);
					host.removeEventListener("copy", onCopy);
					host.removeEventListener("scroll", onScroll, true);
				};
			}, [
				host,
				cwd,
				locate
			]);
			if (popup === null) return null;
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: sidebar_module_css_default.selectionPopup,
				style: {
					left: popup.left,
					top: popup.top
				},
				onMouseDown: (event) => {
					event.preventDefault();
				},
				onClick: () => {
					const current = popupRef.current;
					if (current === null) return;
					insertFileRef(ctx, sessionId, current.ref);
					hide();
				},
				children: t("addToConversation")
			}), document.body);
		}
		/** Diff lines covered by the current selection (`data-diff-path` / `data-diff-line`). */
		function locateDiffSelection(host, _selected) {
			const sel = window.getSelection();
			const nodes = [...host.querySelectorAll("[data-diff-line]")].filter((node) => sel !== null && sel.containsNode(node, true));
			if (nodes.length === 0) return { path: host.getAttribute("data-diff-fallback-path") ?? "diff" };
			const path = nodes[0].dataset.diffPath ?? "diff";
			const nums = nodes.filter((node) => (node.dataset.diffPath ?? path) === path).map((node) => Number(node.dataset.diffLine)).filter((num) => Number.isFinite(num) && num > 0);
			if (nums.length === 0) return { path };
			return {
				path,
				lines: {
					start: Math.min(...nums),
					end: Math.max(...nums)
				}
			};
		}
		//#endregion
		//#region src/client/DiffView.tsx
		/**
		* The real diff surface for the git panel: parses the host's unified diff
		* text (`git diff` / `git show`) and renders it VSCode-style — per-file
		* sections with hunks (`@@ -a,b +c,d @@` headers), old/new line-number
		* gutters, and aligned context / deleted / added rows colored through the
		* DSH tokens. Untracked files produce no `git diff` output, so the caller
		* can pass the file content to render as a full-file addition instead.
		*
		* The parser is a pure function (`parseUnifiedDiff`) so the interesting
		* cases are unit-tested without a DOM.
		*/
		init_clsx();
		init_locales();
		init_sidebar_module_css();
		/** Parse the hunk header `@@ -a[,b] +c[,d] @@ section` (section may contain '@@'). */
		function parseHunkHeader(line) {
			const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
			if (match === null) return null;
			return {
				oldStart: Number(match[1]),
				newStart: Number(match[3]),
				header: match[5] ?? ""
			};
		}
		/**
		* Parse `git diff --no-color` output into file sections and hunks. Rows
		* outside a file section (leading noise) and metadata rows between the
		* `diff --git`/`---`/`+++` headers and the first hunk (index lines, mode
		* changes, rename/similarity lines) are skipped; a section that never
		* reaches a hunk (a mode/rename-only change) stays hunkless so the caller
		* can still draw its path.
		*/
		function parseUnifiedDiff(text) {
			const files = [];
			let current = null;
			let inHunk = false;
			let hunk = null;
			let oldNum = 0;
			let newNum = 0;
			const flushHunk = () => {
				if (current !== null && hunk !== null) current.hunks.push(hunk);
				hunk = null;
				inHunk = false;
			};
			for (const raw of text.split("\n")) {
				if (raw.startsWith("diff --git ")) {
					flushHunk();
					current = {
						oldPath: "",
						newPath: "",
						binary: false,
						hunks: []
					};
					files.push(current);
					continue;
				}
				if (current === null) continue;
				if (raw.startsWith("Binary files ") || raw === "GIT binary patch") {
					flushHunk();
					current.binary = true;
					continue;
				}
				if (raw.startsWith("--- ")) {
					flushHunk();
					current.oldPath = raw.slice(4);
					continue;
				}
				if (raw.startsWith("+++ ")) {
					current.newPath = raw.slice(4);
					continue;
				}
				const header = parseHunkHeader(raw);
				if (header !== null) {
					flushHunk();
					hunk = {
						oldStart: header.oldStart,
						newStart: header.newStart,
						header: header.header,
						lines: []
					};
					oldNum = header.oldStart;
					newNum = header.newStart;
					inHunk = true;
					continue;
				}
				if (!inHunk || hunk === null) continue;
				const marker = raw[0];
				if (marker === "\\") {
					hunk.lines.push({
						kind: "meta",
						text: raw.slice(1),
						oldNum: null,
						newNum: null
					});
					continue;
				}
				if (marker === " ") {
					hunk.lines.push({
						kind: "ctx",
						text: raw.slice(1),
						oldNum,
						newNum
					});
					oldNum += 1;
					newNum += 1;
				} else if (marker === "-") {
					hunk.lines.push({
						kind: "del",
						text: raw.slice(1),
						oldNum,
						newNum: null
					});
					oldNum += 1;
				} else if (marker === "+") {
					hunk.lines.push({
						kind: "add",
						text: raw.slice(1),
						oldNum: null,
						newNum
					});
					newNum += 1;
				} else flushHunk();
			}
			flushHunk();
			return { files };
		}
		/** Build the untracked-file shape: one file, one hunk of pure additions. */
		function untrackedFile(path, content) {
			const lines = [];
			const body = content.endsWith("\n") ? content.slice(0, -1) : content;
			if (body !== "") {
				let num = 1;
				for (const line of body.split("\n")) {
					lines.push({
						kind: "add",
						text: line,
						oldNum: null,
						newNum: num
					});
					num += 1;
				}
			}
			return {
				oldPath: "/dev/null",
				newPath: `b/${path}`,
				binary: false,
				hunks: [{
					oldStart: 0,
					newStart: 1,
					header: "",
					lines
				}]
			};
		}
		/** Strip the `a/` / `b/` prefix git puts on diff paths (not on /dev/null). */
		function displayPath$1(path) {
			if (path === "/dev/null") return path;
			if (path.startsWith("a/") || path.startsWith("b/")) return path.slice(2);
			return path;
		}
		/** The file header badge: added / deleted / renamed / binary ('' for a plain edit). */
		function fileTag(file) {
			if (file.binary) return t("diffBinary");
			if (file.oldPath === "/dev/null") return t("diffAdded");
			if (file.newPath === "/dev/null") return t("diffDeleted");
			if (displayPath$1(file.oldPath) !== displayPath$1(file.newPath)) return t("diffRenamed");
			return null;
		}
		/** Cap the flattened rows like DiffBlock: head + tail, expand button between. */
		const MAX_DIFF_ROWS = 500;
		function DiffView({ diff, untrackedPath, untrackedContent, ctx, sessionId, cwd, onDragFile, onOpenFileAbove }) {
			const parsed = (0, react.useMemo)(() => {
				if (untrackedPath !== void 0) return { files: [untrackedFile(untrackedPath, untrackedContent ?? "")] };
				return parseUnifiedDiff(diff);
			}, [
				diff,
				untrackedPath,
				untrackedContent
			]);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [host, setHost] = (0, react.useState)(null);
			const hostRef = (0, react.useCallback)((node) => {
				setHost(node);
			}, []);
			const rows = (0, react.useMemo)(() => {
				const out = [];
				parsed.files.forEach((file, fileIndex) => {
					out.push({
						key: `f${fileIndex}`,
						file,
						type: "path"
					});
					if (file.binary) return;
					file.hunks.forEach((hunk, hunkIndex) => {
						out.push({
							key: `f${fileIndex}h${hunkIndex}`,
							file,
							type: "hunk",
							hunk
						});
						hunk.lines.forEach((line, lineIndex) => {
							out.push({
								key: `f${fileIndex}h${hunkIndex}l${lineIndex}`,
								file,
								type: "line",
								hunk,
								line
							});
						});
					});
				});
				return out;
			}, [parsed]);
			const hidden = rows.length - MAX_DIFF_ROWS;
			const capped = hidden > 0 && !expanded;
			const headLines = Math.ceil(MAX_DIFF_ROWS / 2);
			const tailLines = 250;
			const head = capped ? rows.slice(0, headLines) : rows;
			const tail = capped ? rows.slice(rows.length - tailLines) : [];
			if (rows.length === 0) return null;
			const renderRow = (row) => {
				if (row.type === "path") {
					const tag = fileTag(row.file);
					const from = displayPath$1(row.file.oldPath);
					const to = displayPath$1(row.file.newPath);
					const path = to === "/dev/null" ? from : to;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitDiffFile,
						draggable: onDragFile !== void 0,
						onDragStart: onDragFile === void 0 ? void 0 : (event) => {
							onDragFile(event, path);
						},
						onDragEnd: onDragFile === void 0 ? void 0 : () => {
							document.body.removeAttribute("data-dsh-tab-dragging");
						},
						onDoubleClick: onOpenFileAbove === void 0 ? void 0 : () => {
							onOpenFileAbove(path);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.gitDiffFilePath,
								children: to
							}),
							from !== to && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: sidebar_module_css_default.gitDiffFileOld,
								children: ["← ", from]
							}),
							tag !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.gitDiffFileTag,
								children: tag
							})
						]
					}, row.key);
				}
				if (row.type === "hunk") {
					const hunk = row.hunk;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitDiffHunk,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: sidebar_module_css_default.gitDiffHunkHeader,
							children: [
								"@@ -",
								hunk.oldStart,
								",",
								hunk.lines.filter((l) => l.oldNum !== null).length,
								" +",
								hunk.newStart,
								",",
								hunk.lines.filter((l) => l.newNum !== null).length,
								" @@"
							]
						}), hunk.header !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.gitDiffHunkSection,
							children: hunk.header
						})]
					}, row.key);
				}
				const line = row.line;
				const lineClass = line.kind === "del" ? sidebar_module_css_default.gitDiffDel : line.kind === "add" ? sidebar_module_css_default.gitDiffAdd : line.kind === "meta" ? sidebar_module_css_default.gitDiffMeta : sidebar_module_css_default.gitDiffCtx;
				const path = displayPath$1(row.file.newPath === "/dev/null" ? row.file.oldPath : row.file.newPath);
				const lineNo = line.newNum ?? line.oldNum;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: clsx(sidebar_module_css_default.gitDiffLine, lineClass),
					"data-diff-path": path,
					"data-diff-line": lineNo ?? void 0,
					children: line.kind === "meta" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.gitDiffMetaText,
						children: line.text
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.gitDiffNum,
						"data-diff-gutter": true,
						children: lineNo ?? ""
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.gitDiffCode,
						children: line.text
					})] })
				}, row.key);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: hostRef,
				className: sidebar_module_css_default.gitDiff,
				"data-diff-fallback-path": untrackedPath,
				children: [
					head.map(renderRow),
					hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.gitDiffExpand,
						"aria-expanded": expanded,
						onClick: () => {
							setExpanded((value) => !value);
						},
						children: expanded ? t("diffCollapse") : t("diffExpand", { count: hidden })
					}),
					tail.map(renderRow),
					ctx !== void 0 && sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionQuote, {
						ctx,
						sessionId,
						cwd,
						host,
						locate: locateDiffSelection
					})
				]
			});
		}
		//#endregion
		//#region src/client/review/review-actions.ts
		/**
		* Keep / Undo for an agent-produced file or one painted island.
		* Keep records acceptance (disk already has the new text). Undo restores
		* HEAD / splices one island / deletes a new file. File-level and hunk-level
		* share the same Ctrl+Z stack.
		*/
		async function keepEdit(sessionId, path, edit) {
			setReviewDecision(sessionId, path, "kept", edit);
			pushReviewRevert({
				kind: "file-keep",
				sessionId,
				path,
				edit
			});
		}
		async function undoEdit(scope, path, kind, edit) {
			const current = await api.fsRead(scope, path).catch(() => null);
			const previous = current?.kind === "text" ? current.content : null;
			const snapshot = edit?.oldText;
			let next;
			if (kind === "add" || snapshot === null) {
				await api.fsUnlink(scope, path);
				next = null;
			} else if (typeof snapshot === "string") {
				await api.fsWrite(scope, path, snapshot);
				next = snapshot;
			} else {
				const target = await gitFileTarget(scope, path);
				const shown = await api.gitShow(target.scope, target.gitPath, "HEAD").catch(() => ({ content: null }));
				if (shown.content !== null) {
					await api.fsWrite(scope, path, shown.content);
					next = shown.content;
				} else if (kind === "delete") throw new Error("no HEAD copy to restore");
				else {
					await api.fsUnlink(scope, path);
					next = null;
				}
			}
			setReviewDecision(scope.sessionId, path, "undone", edit);
			pushReviewRevert({
				kind: "file-undo",
				sessionId: scope.sessionId,
				path,
				previous,
				next,
				edit
			});
			return next;
		}
		/** Ctrl/Cmd+Z / Shift+Z for the shared file+hunk stack. Returns false when empty. */
		async function revertLastReview(scope, path, direction) {
			const entry = direction === "undo" ? popReviewUndo(scope.sessionId, path) : popReviewRedo(scope.sessionId, path);
			if (entry === void 0) return { applied: false };
			if (entry.kind === "keep") {
				applyReviewDecision(entry, direction === "undo" ? void 0 : "kept");
				return { applied: true };
			}
			if (entry.kind === "file-keep") {
				applyReviewDecision(entry, direction === "undo" ? void 0 : "kept");
				return { applied: true };
			}
			const content = contentAfterRevert(entry, direction);
			if (content === null) await api.fsUnlink(scope, path).catch(() => void 0);
			else if (typeof content === "string") await api.fsWrite(scope, path, content);
			applyReviewDecision(entry, direction === "undo" ? void 0 : "undone");
			return {
				applied: true,
				content
			};
		}
		//#endregion
		//#region src/client/review/review-filter.ts
		init_prefs_shared();
		/** True when All / Reviewed still need older conversation nodes to fill one page. */
		function needsOlderTurns(groupCount, pageSize, hasMore) {
			return hasMore && groupCount < clampReviewDoneSessions(pageSize);
		}
		function pendingEdits(sessionId, edits) {
			return latestSessionEdits(edits).filter((edit) => decisionOf(sessionId, edit.path, edit) === void 0);
		}
		//#endregion
		//#region src/client/review/use-session-edits.ts
		/**
		* Live agent-produced files for the current conversation. Reads the
		* session face through `ctx.sessions.binding` when the runtime exposes
		* it; older hosts just yield an empty list. `loadOlder` pages earlier
		* conversation nodes so Review can keep scrolling for more file writes.
		*/
		const empty = [];
		const emptySnap = {};
		function useSessionEdits(ctx, sessionId, cwd) {
			const session = (sessionId === void 0 ? void 0 : ctx.sessions?.binding?.(sessionId))?.session;
			const readSnap = (0, react.useCallback)(() => session?.getSnapshot() ?? emptySnap, [session]);
			const snapshot = (0, react.useSyncExternalStore)((0, react.useCallback)((listener) => session?.subscribe(listener) ?? (() => {}), [session]), readSnap, readSnap);
			const edits = (0, react.useMemo)(() => collectSessionEdits(snapshot.nodes ?? empty, cwd), [snapshot.nodes, cwd]);
			const latest = (0, react.useMemo)(() => latestSessionEdits(edits), [edits]);
			(0, react.useSyncExternalStore)(subscribeReview, reviewRevision, reviewRevision);
			const pending = sessionId === void 0 ? 0 : pendingCount(sessionId, latest);
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				hydrateReview({
					sessionId,
					cwd
				});
			}, [sessionId, cwd]);
			const loadOlder = (0, react.useCallback)(async () => {
				await session?.loadOlder?.();
			}, [session]);
			return {
				edits,
				latest,
				pending,
				hasMore: snapshot.hasMore === true,
				loadingOlder: snapshot.loadingOlder === true,
				loadOlder
			};
		}
		//#endregion
		//#region src/client/review/ReviewView.tsx
		/**
		* Review of files the current conversation wrote. Pending is the full
		* current-session set. All / Reviewed show this session's turns in pages
		* (default 30) and load older turns / file writes as the list scrolls.
		*/
		init_clsx();
		init_prefs_shared();
		init_locales();
		init_sidebar_module_css();
		function baseName$1(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		function gitKindOf(kind) {
			if (kind === "add") return "add";
			if (kind === "delete") return "del";
			return "mod";
		}
		function badgeOf(kind) {
			if (kind === "add") return "A";
			if (kind === "delete") return "D";
			return "M";
		}
		function kindLabel(kind) {
			if (kind === "add") return t("reviewAdded");
			if (kind === "delete") return t("reviewDeleted");
			return t("reviewEdited");
		}
		function sessionWhen(updatedAt) {
			if (updatedAt === void 0 || !Number.isFinite(updatedAt) || updatedAt <= 0) return "";
			return relativeTime(new Date(updatedAt).toISOString());
		}
		function FileRows(props) {
			const { ctx, store, sessionId, cwd, edits, latest, busy, onKeep, onUndo } = props;
			const tipOf = (edit) => latest.find((row) => row.path === edit.path) ?? edit;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: groupEditsByTurn(edits).map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.reviewGroup,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.reviewGroupHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.reviewGroupMeta,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.reviewGroupTurn,
								children: group.turn === void 0 ? t("reviewTurnUnknown") : t("reviewTurn", { n: group.turn })
							}),
							sessionWhen(group.time) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.reviewSessionTime,
								children: sessionWhen(group.time)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.reviewGroupCount,
								children: t("reviewFileCount", { count: group.edits.length })
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.reviewGroupPrompt,
						children: group.prompt === "" ? t("reviewNoPrompt") : promptPreview(group.prompt, 96)
					})]
				}), group.edits.map((edit) => {
					const decision = decisionOf(sessionId, edit.path, tipOf(edit));
					const color = classOfKind(gitKindOf(edit.kind));
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.reviewRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: sidebar_module_css_default.reviewMain,
							title: edit.path,
							onClick: () => {
								openSidebarFile(ctx, store, sessionId, edit.path);
							},
							onDoubleClick: () => {
								openSidebarFileAbove(ctx, store, sessionId, edit.path);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(sidebar_module_css_default.reviewKind, color),
									title: kindLabel(edit.kind),
									children: badgeOf(edit.kind)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: clsx(sidebar_module_css_default.reviewName, color, edit.kind === "delete" && sidebar_module_css_default.gitDeletedText),
									children: baseName$1(edit.path)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.reviewPath,
									children: edit.path
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.reviewActions,
							children: decision === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.reviewUndo,
								disabled: busy !== null,
								onClick: () => {
									onUndo(sessionId, cwd, edit);
								},
								children: t("reviewUndo")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.reviewKeep,
								disabled: busy !== null,
								onClick: () => {
									onKeep(sessionId, edit);
								},
								children: t("reviewKeep")
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.reviewDone,
								children: decision === "kept" ? t("reviewKept") : t("reviewUndone")
							})
						})]
					}, `${edit.turn ?? "x"}:${edit.path}`);
				})]
			}, `${sessionId}:${group.key}`)) });
		}
		function ReviewView(props) {
			const { ctx, store, scope } = props;
			const { edits, latest, pending, hasMore, loadingOlder, loadOlder } = useSessionEdits(ctx, scope.sessionId, scope.cwd);
			const tick = (0, react.useSyncExternalStore)(subscribeReview, reviewRevision);
			const pageSize = clampReviewDoneSessions((0, react.useSyncExternalStore)((0, react.useCallback)((listener) => store.subscribe(listener), [store]), store.getSnapshot).prefs.reviewDoneSessionLimit);
			rememberReviewScope(scope);
			(0, react.useEffect)(() => {
				hydrateReview(scope);
			}, [scope.sessionId, scope.cwd]);
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [filter, setFilter] = (0, react.useState)("pending");
			const [visibleTurns, setVisibleTurns] = (0, react.useState)(pageSize);
			const [loadingMore, setLoadingMore] = (0, react.useState)(false);
			const listRef = (0, react.useRef)(null);
			const waiting = (0, react.useMemo)(() => pendingEdits(scope.sessionId, edits), [
				edits,
				scope.sessionId,
				tick
			]);
			const decidedAll = (0, react.useMemo)(() => edits.filter((edit) => decisionOf(scope.sessionId, edit.path, latest.find((row) => row.path === edit.path) ?? edit) !== void 0), [
				edits,
				latest,
				scope.sessionId,
				tick
			]);
			const listed = filter === "pending" ? waiting : filter === "all" ? [...waiting, ...decidedAll] : decidedAll;
			const groups = (0, react.useMemo)(() => groupEditsByTurn(listed), [listed]);
			const visibleEdits = groups.slice(0, visibleTurns).flatMap((group) => group.edits);
			const moreTurns = groups.length > visibleTurns;
			const fillPage = filter !== "pending" && needsOlderTurns(groups.length, pageSize, hasMore);
			const canLoadMore = moreTurns || fillPage || hasMore && listed.length > 0;
			(0, react.useEffect)(() => {
				setVisibleTurns(pageSize);
			}, [filter, pageSize]);
			const run = (0, react.useCallback)(async (path, work) => {
				setBusy(path);
				setError(null);
				try {
					await work();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(null);
				}
			}, []);
			const keepOne = (sessionId, edit) => {
				const tip = latest.find((row) => row.path === edit.path) ?? edit;
				run(edit.path, () => keepEdit(sessionId, edit.path, tip));
			};
			const undoOne = (sessionId, cwd, edit) => {
				const tip = latest.find((row) => row.path === edit.path) ?? edit;
				run(edit.path, () => undoEdit({
					sessionId,
					cwd
				}, edit.path, tip.kind, tip));
			};
			const keepAll = () => {
				run("*", async () => {
					for (const edit of waiting) await keepEdit(scope.sessionId, edit.path, edit);
				});
			};
			const undoAll = () => {
				run("*", async () => {
					for (const edit of waiting) await undoEdit(scope, edit.path, edit.kind, edit);
				});
			};
			const loadMore = (0, react.useCallback)(async () => {
				if (loadingMore || loadingOlder) return;
				setLoadingMore(true);
				try {
					if (moreTurns) setVisibleTurns((count) => count + pageSize);
					else if (fillPage || hasMore && listed.length > 0) await loadOlder();
				} finally {
					setLoadingMore(false);
				}
			}, [
				fillPage,
				hasMore,
				listed.length,
				loadOlder,
				loadingMore,
				loadingOlder,
				moreTurns,
				pageSize
			]);
			const onListScroll = (event) => {
				const el = event.currentTarget;
				if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) return;
				loadMore();
			};
			const fillKey = `${filter}:${visibleTurns}:${groups.length}:${hasMore}`;
			const filled = (0, react.useRef)("");
			const olderTries = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				olderTries.current = 0;
			}, [
				scope.sessionId,
				pageSize,
				filter
			]);
			(0, react.useEffect)(() => {
				if (fillPage && !loadingOlder && !loadingMore && olderTries.current < 20) {
					olderTries.current += 1;
					loadMore();
					return;
				}
				const el = listRef.current;
				if (el === null || !moreTurns) return;
				if (filled.current === fillKey) return;
				if (el.scrollHeight > el.clientHeight + 8) return;
				filled.current = fillKey;
				loadMore();
			}, [
				fillKey,
				fillPage,
				loadMore,
				loadingMore,
				loadingOlder,
				moreTurns
			]);
			const empty = listed.length === 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.reviewRoot,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.reviewToolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.reviewCount,
								children: t("reviewPending", { count: pending })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: sidebar_module_css_default.reviewToolbarGrow }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.reviewGhost,
								disabled: pending === 0 || busy !== null,
								onClick: keepAll,
								children: t("reviewKeepAll")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.reviewGhost,
								disabled: pending === 0 || busy !== null,
								onClick: undoAll,
								children: t("reviewUndoAll")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.reviewFilter,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: filter === "pending" ? sidebar_module_css_default.reviewFilterActive : sidebar_module_css_default.reviewFilterBtn,
								onClick: () => {
									setFilter("pending");
								},
								children: t("reviewFilterPending")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: filter === "all" ? sidebar_module_css_default.reviewFilterActive : sidebar_module_css_default.reviewFilterBtn,
								onClick: () => {
									setFilter("all");
								},
								children: t("reviewFilterAll")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: filter === "done" ? sidebar_module_css_default.reviewFilterActive : sidebar_module_css_default.reviewFilterBtn,
								onClick: () => {
									setFilter("done");
								},
								children: t("reviewFilterDone")
							})
						]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.reviewError,
						children: error
					}),
					empty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.reviewEmpty,
						children: edits.length === 0 && filter !== "done" ? t("reviewEmpty") : t("reviewCaughtUp")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: listRef,
						className: sidebar_module_css_default.reviewList,
						onScroll: onListScroll,
						children: [visibleEdits.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileRows, {
							ctx,
							store,
							sessionId: scope.sessionId,
							cwd: scope.cwd,
							edits: visibleEdits,
							latest,
							busy,
							onKeep: keepOne,
							onUndo: undoOne
						}), canLoadMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.reviewLoadMore,
							disabled: loadingMore || loadingOlder,
							onClick: () => {
								loadMore();
							},
							children: loadingMore || loadingOlder ? t("loading") : t("loadMore")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/review/ReviewBar.tsx
		/**
		* Keep / Undo strip on a file preview when the current conversation wrote
		* that file and the user has not decided yet.
		*/
		init_locales();
		init_sidebar_module_css();
		function ReviewBar(props) {
			const { scope, edit, onDone } = props;
			(0, react.useSyncExternalStore)(subscribeReview, reviewRevision);
			const decision = decisionOf(scope.sessionId, edit.path, edit);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			if (decision !== void 0) return null;
			const run = (work) => {
				setBusy(true);
				setError(null);
				work().then((next) => {
					onDone?.(typeof next === "string" || next === null ? next : void 0);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setBusy(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.reviewBar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.reviewBarLabel,
						children: t("reviewBarHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: sidebar_module_css_default.reviewBarGrow }),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.reviewBarError,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.reviewUndo,
						disabled: busy,
						onClick: () => {
							run(() => undoEdit(scope, edit.path, edit.kind, edit));
						},
						children: t("reviewUndo")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.reviewKeep,
						disabled: busy,
						onClick: () => {
							run(() => keepEdit(scope.sessionId, edit.path, edit));
						},
						children: t("reviewKeep")
					})
				]
			});
		}
		//#endregion
		//#region src/client/review/ReviewHunkBar.tsx
		/**
		* Hover Keep / Undo for one git hunk in the file preview. Hidden until
		* the pointer is over that block (Cursor-style).
		*/
		init_sidebar_module_css();
		//#endregion
		//#region src/client/EditorHost.tsx
		/**
		* The editor tab host: resolves a file's previewer through the sidebar
		* registry (`matchFileViewer`), fetches bytes per the matched viewer's
		* fetch strategy, and renders its component — or the shared download pane
		* when nothing can render the file. The header shows the file title; the
		* editable code/markdown viewers render their own toolbar below it.
		*
		* The strategy dispatch is pure (planFirstMatch / planFsReadOutcome in
		* editor-load.ts); this component only wires it to the host APIs.
		*/
		init_clsx();
		init_locales();
		init_sidebar_module_css();
		function EditorHost(props) {
			const { ctx, store, scope, path, title } = props;
			const [load, setLoad] = (0, react.useState)({ status: "loading" });
			const rootRef = (0, react.useRef)(null);
			const { latest } = useSessionEdits(ctx, scope.sessionId, scope.cwd);
			const abs = resolveSidebarPath(scope.cwd, path);
			const review = latest.find((edit) => edit.path === abs || edit.path === path);
			const reviewTick = (0, react.useSyncExternalStore)(subscribeReview, reviewRevision);
			const fileDecision = review === void 0 ? void 0 : decisionOf(scope.sessionId, review.path, review);
			const seenDecision = (0, react.useRef)({
				path: "",
				tick: -1
			});
			const applyContent = (next) => {
				if (next === void 0) return;
				setLoad((current) => current.status === "ready" ? {
					...current,
					content: next ?? ""
				} : current);
			};
			(0, react.useEffect)(() => {
				let cancelled = false;
				const controller = new AbortController();
				setLoad({ status: "loading" });
				const mediaUrlOf = () => mediaUrl(scope, path);
				const apply = (action) => {
					if (cancelled) return;
					switch (action.kind) {
						case "binary":
							setLoad({ status: "binary" });
							return;
						case "render":
							setLoad({
								status: "ready",
								viewer: action.viewer,
								content: action.content,
								truncated: action.truncated,
								mediaUrl: action.mediaUrl,
								customData: action.customData
							});
							return;
						case "customLoad":
							action.viewer.load?.(path, scope, controller.signal).then((data) => {
								if (cancelled) return;
								setLoad({
									status: "ready",
									viewer: action.viewer,
									customData: data
								});
							}).catch((error) => {
								if (cancelled) return;
								setLoad({
									status: "error",
									message: error instanceof Error ? error.message : String(error)
								});
							});
							return;
						case "fetchFsRead":
							api.fsRead(scope, path).then((result) => {
								if (cancelled) return;
								const outcome = planFsReadOutcome(action.viewer, {
									binary: result.kind === "binary",
									content: result.kind === "text" ? result.content : "",
									truncated: result.truncated,
									head: result.kind === "binary" ? result.head : void 0
								}, (head) => ctx.betterSidebar?.matchFileViewer(path, head), mediaUrlOf);
								apply(outcome);
							}).catch((error) => {
								if (cancelled) return;
								setLoad({
									status: "error",
									message: error instanceof Error ? error.message : String(error)
								});
							});
							return;
					}
				};
				apply(planFirstMatch(ctx.betterSidebar?.matchFileViewer(path), mediaUrlOf));
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [
				scope.sessionId,
				scope.cwd,
				path,
				ctx
			]);
			(0, react.useEffect)(() => {
				if (review === void 0) return;
				const prev = seenDecision.current;
				if (prev.path !== path) {
					seenDecision.current = {
						path,
						tick: reviewTick,
						decision: fileDecision
					};
					return;
				}
				if (prev.tick === reviewTick && prev.decision === fileDecision) return;
				seenDecision.current = {
					path,
					tick: reviewTick,
					decision: fileDecision
				};
				let cancelled = false;
				api.fsRead(scope, path).then((result) => {
					if (cancelled) return;
					applyContent(result.kind === "text" ? result.content : "");
				}).catch(() => {
					if (!cancelled) applyContent("");
				});
				return () => {
					cancelled = true;
				};
			}, [
				fileDecision,
				reviewTick,
				path,
				review,
				scope
			]);
			(0, react.useEffect)(() => {
				const root = rootRef.current;
				if (root === null) return;
				const onKey = (event) => {
					if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
					if (event.target instanceof Element && event.target.closest(".cm-editor") !== null) return;
					const key = event.key.toLowerCase();
					const redo = key === "y" || key === "z" && event.shiftKey;
					const undo = key === "z" && !event.shiftKey;
					if (!undo && !redo) return;
					const direction = undo ? "undo" : "redo";
					if (!canRevertReview(scope.sessionId, abs, direction)) return;
					event.preventDefault();
					event.stopPropagation();
					revertLastReview(scope, abs, direction).then((result) => {
						if (!result.applied) return;
						applyContent(result.content);
					});
				};
				root.addEventListener("keydown", onKey);
				return () => {
					root.removeEventListener("keydown", onKey);
				};
			}, [abs, scope]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editor,
				ref: rootRef,
				tabIndex: -1,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: clsx(sidebar_module_css_default.editorHeader, sidebar_module_css_default.editorPathHeader),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.editorTitle,
							title: path,
							children: title
						})
					}),
					review !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReviewBar, {
						scope,
						edit: review,
						onDone: (next) => {
							applyContent(next);
							requestAnimationFrame(() => {
								rootRef.current?.focus();
							});
						}
					}),
					load.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.editorPlaceholder,
						children: t("loading")
					}),
					load.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.editorError,
						children: load.message
					}),
					load.status === "binary" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BinaryDownload, {
						scope,
						path
					}),
					load.status === "ready" && (0, react.createElement)(load.viewer.component, {
						ctx,
						store,
						scope,
						path,
						title,
						viewerId: load.viewer.id,
						content: load.content,
						truncated: load.truncated,
						mediaUrl: load.mediaUrl,
						customData: load.customData
					})
				]
			});
		}
		//#endregion
		//#region src/client/lazy-chunk.tsx
		/**
		* Lazy chunk view wrapper: mounts a component that lives in a lazy chunk,
		* showing a loading placeholder while the chunk script loads and an error +
		* retry affordance on failure. Used by the built-in tab/viewer descriptors.
		*
		* Contract note: {@link lazyChunkComponent} returns a plain render-prop
		* function — the descriptor contract is `component: (props) => ReactNode`,
		* and the repo renders descriptors BOTH ways: Sidebar calls
		* `descriptor.component(props)` directly, EditorHost renders it via
		* `createElement`. The wrapper function body therefore contains no hooks;
		* all state lives in the inner {@link LazyChunkView} component.
		*/
		init_locales();
		init_sidebar_module_css();
		function LazyChunkView({ chunk, pick, props }) {
			const [attempt, setAttempt] = (0, react.useState)(0);
			const [state, setState] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				let cancelled = false;
				setState({ status: "loading" });
				loadChunk(chunk).then((mod) => {
					if (cancelled) return;
					const Comp = pick(mod);
					if (Comp === void 0) {
						setState({
							status: "error",
							message: `[dsh-better-sidebar] chunk "${chunk}" is missing its component`
						});
						return;
					}
					setState({
						status: "ready",
						Comp
					});
				}).catch((error) => {
					if (cancelled) return;
					setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				chunk,
				pick,
				attempt
			]);
			if (state.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.editorPlaceholder,
				children: t("loading")
			});
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorError,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: state.message }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: sidebar_module_css_default.terminalRetry,
					onClick: () => {
						setAttempt((current) => current + 1);
					},
					children: t("terminalRetry")
				})]
			});
			return (0, react.createElement)(state.Comp, props);
		}
		/**
		* Build a descriptor-compatible lazy wrapper for a chunk-resident component.
		* The returned function is the descriptor `component` itself: it returns an
		* element and never calls hooks, so both invocation styles (plain function
		* call and createElement/JSX render) work. `pick` must be a module-level
		* function (stable identity) — an inline lambda would re-trigger the load
		* effect on every render.
		* @param chunk - the chunk name (see chunk-loader.ts).
		* @param pick - select the component from the chunk's exports.
		*/
		function lazyChunkComponent(chunk, pick) {
			return (props) => (0, react.createElement)(LazyChunkView, {
				chunk,
				pick,
				props
			});
		}
		//#endregion
		//#region src/client/git-groups.ts
		/** The file name shown inside a group (basename); the full path when ungrouped. */
		function displayNameOf(path, mode) {
			if (mode === "none") return path;
			const norm = path.replace(/\\/g, "/");
			const slash = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"));
			return slash === -1 ? path : path.slice(slash + 1);
		}
		//#endregion
		//#region src/client/git-tree.ts
		/** Split a repo-relative path into non-empty segments (`a\\b` → `['a','b']`). */
		function pathSegments(path) {
			return path.replace(/\\/g, "/").split("/").filter((part) => part !== "");
		}
		/**
		* Build a sorted directory tree. Files at the repo root sit at the top
		* level; intermediate folders become expandable dir nodes.
		*/
		function buildPathTree(entries) {
			const root = {
				kind: "dir",
				name: "",
				key: "",
				dirs: /* @__PURE__ */ new Map(),
				files: []
			};
			for (const entry of entries) {
				const parts = pathSegments(entry.path);
				if (parts.length === 0) continue;
				let node = root;
				for (let index = 0; index < parts.length - 1; index += 1) {
					const name = parts[index];
					const key = parts.slice(0, index + 1).join("/");
					let next = node.dirs.get(name);
					if (next === void 0) {
						next = {
							kind: "dir",
							name,
							key,
							dirs: /* @__PURE__ */ new Map(),
							files: []
						};
						node.dirs.set(name, next);
					}
					node = next;
				}
				const name = parts[parts.length - 1];
				node.files.push({
					kind: "file",
					name,
					key: entry.path,
					entry
				});
			}
			const freeze = (dir) => {
				const dirs = [...dir.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map((child) => ({
					kind: "dir",
					name: child.name,
					key: child.key,
					children: freeze(child)
				}));
				const files = [...dir.files].sort((a, b) => a.name.localeCompare(b.name));
				return compactPathTree([...dirs, ...files]);
			};
			return freeze(root);
		}
		/**
		* Collapse a chain of single-child directories into one row
		* (`src/main/java/com/hexin`) — IDEA/VSCode style. A folder that has
		* files or more than one child stays a real expand point.
		*/
		function compactPathTree(nodes) {
			return nodes.map((node) => compactNode(node));
		}
		function compactNode(node) {
			if (node.kind === "file") return node;
			let name = node.name;
			let key = node.key;
			let children = compactPathTree(node.children);
			while (children.length === 1) {
				const only = children[0];
				if (only === void 0 || only.kind !== "dir") break;
				name = `${name}/${only.name}`;
				key = only.key;
				children = only.children;
			}
			return {
				kind: "dir",
				name,
				key,
				children
			};
		}
		/** Every directory key in the tree (used to start fully expanded). */
		function collectDirKeys(nodes) {
			const keys = [];
			const walk = (items) => {
				for (const node of items) {
					if (node.kind !== "dir") continue;
					keys.push(node.key);
					walk(node.children);
				}
			};
			walk(nodes);
			return keys;
		}
		//#endregion
		//#region src/client/GitPathTree.tsx
		/**
		* Collapsible directory tree for git file lists. Directories toggle open /
		* closed; files are rendered by the caller so status / history rows keep
		* their own actions and colors.
		*/
		init_sidebar_module_css();
		function GitPathTree(props) {
			const { nodes, renderFile } = props;
			const allKeys = (0, react.useMemo)(() => collectDirKeys(nodes), [nodes]);
			const [collapsed, setCollapsed] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				setCollapsed((current) => {
					const known = new Set(allKeys);
					let changed = false;
					const next = /* @__PURE__ */ new Set();
					for (const key of current) if (known.has(key)) next.add(key);
					else changed = true;
					return changed ? next : current;
				});
			}, [allKeys]);
			const toggle = (0, react.useCallback)((key) => {
				setCollapsed((current) => {
					const next = new Set(current);
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			}, []);
			const rows = [];
			const walk = (items, depth) => {
				for (const node of items) {
					if (node.kind === "dir") {
						const open = !collapsed.has(node.key);
						rows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: sidebar_module_css_default.gitTreeDir,
							style: { paddingLeft: 8 + depth * 14 },
							"aria-expanded": open,
							onClick: () => {
								toggle(node.key);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: open ? sidebar_module_css_default.gitTreeChevronOpen : sidebar_module_css_default.gitTreeChevron,
								"aria-hidden": true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.gitTreeDirName,
								children: node.name
							})]
						}, `d:${node.key}`));
						if (open) walk(node.children, depth + 1);
						continue;
					}
					rows.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitTreeFile,
						style: { paddingLeft: 8 + depth * 14 },
						children: renderFile(node.entry, node.name, depth)
					}, `f:${node.key}`));
				}
			};
			walk(nodes, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: rows });
		}
		//#endregion
		//#region src/client/GitView.tsx
		/**
		* The source-control panel: an IDEA-style three-way status list (staged /
		* modified / untracked), stage/unstage, commit with a message box, and
		* branch switch. History is NOT inlined — "Open in bottom panel" lands an
		* IDEA-style log tab next to the terminal. File rows open a right-click
		* menu (open / stage / discard / copy). Refresh is manual + on mount.
		*/
		init_locales();
		init_state();
		init_conversation_views();
		init_sidebar_module_css();
		const GROUP_BY_KEY = "dsh-sidebar:git-group-by";
		function readGroupBy() {
			try {
				const stored = localStorage.getItem(GROUP_BY_KEY);
				if (stored === "directory" || stored === "module" || stored === "none") return stored;
			} catch {}
			return "module";
		}
		const snapshots = /* @__PURE__ */ new Map();
		function snapshotKey(scope) {
			return `${scope.sessionId}\0${scope.cwd ?? ""}`;
		}
		/** The badge's class list (base badge + its status color). */
		function badgeClassName(entry) {
			return [sidebar_module_css_default.gitBadge, classOfKind(kindOfEntry(entry))].filter(Boolean).join(" ");
		}
		/** The file path's class list (base name + status color; deleted rows also
		*  get a strikethrough so the removal reads at a glance). */
		function nameClassName(entry) {
			const classes = [sidebar_module_css_default.gitName, classOfKind(kindOfEntry(entry))];
			if (badgeOf$1(entry) === "D") classes.push(sidebar_module_css_default.gitDeletedText);
			return classes.filter(Boolean).join(" ");
		}
		/** Whether the entry carries STAGED (index) changes — the X letter is set. */
		function isStagedEntry(entry) {
			const index = entry.xy[0];
			return index !== void 0 && index !== " " && index !== "?";
		}
		/** Whether the entry carries UNSTAGED (worktree) changes — the Y letter is set.
		*  Untracked `??` also satisfies this (it is a worktree-only change), but the
		*  panel buckets it separately via {@link isUntracked}; a file with both
		*  letters set ('MM') lands in BOTH staged and modified. */
		function isUnstagedEntry(entry) {
			if (entry.xy === "??") return true;
			const worktree = entry.xy[1];
			return worktree !== void 0 && worktree !== " " && worktree !== "?";
		}
		/** Whether the entry is untracked (`??`): git diff never includes it. */
		function isUntracked(entry) {
			return badgeOf$1(entry) === "?";
		}
		/** The last path segment (tab title for a file's diff). */
		function baseName(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		function GitView(props) {
			const { scope, store, onOpenFile, onOpenDiff } = props;
			const cached = snapshots.get(snapshotKey(scope));
			const [status, setStatus] = (0, react.useState)(cached?.status ?? null);
			const [repos, setRepos] = (0, react.useState)(cached?.repos ?? []);
			const [repoRoot, setRepoRoot] = (0, react.useState)(cached?.repoRoot);
			const [groupBy, setGroupBy] = (0, react.useState)(readGroupBy);
			const [loading, setLoading] = (0, react.useState)(cached === void 0);
			const [error, setError] = (0, react.useState)(null);
			const [branchNames, setBranchNames] = (0, react.useState)(cached?.branchNames ?? []);
			const [commitMsg, setCommitMsg] = (0, react.useState)(cached?.commitMsg ?? "");
			const [busy, setBusy] = (0, react.useState)(false);
			const [commitError, setCommitError] = (0, react.useState)(null);
			/** The open file-row context menu (cursor position for the portaled Menu). */
			const [fileMenu, setFileMenu] = (0, react.useState)(null);
			/** The pending destructive action awaiting confirmation. */
			const [confirm, setConfirm] = (0, react.useState)(null);
			/** The multi-repo picker modal (a workspace with several git roots). */
			const [repoPickerOpen, setRepoPickerOpen] = (0, react.useState)(false);
			/** Branch / group-by menus portal out of the overflow-clipped panel. */
			const [branchMenuOpen, setBranchMenuOpen] = (0, react.useState)(false);
			const [groupMenuOpen, setGroupMenuOpen] = (0, react.useState)(false);
			/** IDEA-style three-way split: staged (index X), modified (worktree Y on a
			*  tracked file), untracked (`??`). A file with both index and worktree
			*  changes ('MM') appears in BOTH staged and modified. */
			const entries = status?.entries ?? [];
			const stagedEntries = entries.filter(isStagedEntry);
			const untrackedEntries = entries.filter(isUntracked);
			const modifiedEntries = entries.filter((entry) => isUnstagedEntry(entry) && !isUntracked(entry));
			const gitScope = {
				...scope,
				repo: repoRoot
			};
			(0, react.useEffect)(() => {
				snapshots.set(snapshotKey(scope), {
					repos,
					repoRoot,
					status,
					branchNames,
					commitMsg
				});
			}, [
				scope.sessionId,
				scope.cwd,
				repos,
				repoRoot,
				status,
				branchNames,
				commitMsg
			]);
			const refresh = (0, react.useCallback)(async (nextRepo) => {
				const key = snapshotKey(scope);
				const keep = snapshots.get(key);
				if (keep === void 0 || nextRepo !== void 0) setLoading(true);
				setError(null);
				try {
					const listed = await api.gitRepos(scope).catch(() => ({ repos: [] }));
					const preferred = nextRepo ?? keep?.repoRoot ?? repoRoot;
					const selected = preferred !== void 0 && listed.repos.some((repo) => repo.root === preferred) ? preferred : listed.repos[0]?.root;
					const active = {
						...scope,
						repo: selected
					};
					const [statusResult, branchResult] = await Promise.all([api.gitStatus(active), api.gitBranch(active).catch(() => ({
						current: "",
						names: []
					}))]);
					const root = statusResult.root ?? selected;
					setRepos(listed.repos);
					setRepoRoot(root);
					setStatus(statusResult);
					setBranchNames(branchResult.names);
					snapshots.set(key, {
						repos: listed.repos,
						repoRoot: root,
						status: statusResult,
						branchNames: branchResult.names,
						commitMsg: snapshots.get(key)?.commitMsg ?? keep?.commitMsg ?? ""
					});
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setLoading(false);
				}
			}, [scope.sessionId, scope.cwd]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			/** Open the IDEA-style log in the bottom panel (same strip as the terminal). */
			const openHistory = () => {
				const repo = repoRoot ?? "";
				store.reduce((s) => openHistoryTab(s, {
					id: `git-log:${repo || "default"}`,
					type: "git-log",
					title: t("history"),
					meta: repo === "" ? void 0 : repo
				}));
			};
			/** One change's diff tab (id is path+side so the same file focuses). */
			const worktreeDiffTab = (entry, staged) => ({
				id: `diff:w:${staged ? "s" : "u"}:${entry.path}`,
				type: "diff",
				title: baseName(entry.path),
				diff: {
					kind: "worktree",
					path: entry.path,
					staged,
					untracked: isUntracked(entry),
					repo: repoRoot
				}
			});
			/** Click: preview in the workbench below the source-control pane. */
			const openWorktreeDiff = (entry, staged) => {
				onOpenDiff(worktreeDiffTab(entry, staged));
			};
			/** Double-click: dock the same preview onto the conversation header. */
			const dockWorktreeDiff = (entry, staged) => {
				const tab = worktreeDiffTab(entry, staged);
				const prefs = store.getPrefs();
				store.reduce((s) => dockTabToCenter(s, "seed", tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax));
				focusLatestCenterView(tab.title);
			};
			const stageEntry = async (entry, staged) => {
				setBusy(true);
				try {
					if (staged) await api.gitUnstage(gitScope, entry.path);
					else await api.gitStage(gitScope, entry.path);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			const unstageAll = async () => {
				setBusy(true);
				try {
					await api.gitUnstage(gitScope);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			/** Stage all tracked modifications/deletions (untracked files stay put). */
			const stageTrackedAll = async () => {
				setBusy(true);
				try {
					await api.gitStageTracked(gitScope);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			/** Add all untracked files to the index in one batch. */
			const stageUntrackedAll = async () => {
				setBusy(true);
				try {
					await api.gitStageUntracked(gitScope, untrackedEntries.map((entry) => entry.path));
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			const commit = async () => {
				const message = commitMsg.trim();
				if (message === "" || busy) return;
				setBusy(true);
				setCommitError(null);
				try {
					await api.gitCommit(gitScope, message);
					setCommitMsg("");
					await refresh();
				} catch (reason) {
					setCommitError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			};
			const checkout = async (branch) => {
				if (branch === status?.branch || busy) return;
				setBusy(true);
				setCommitError(null);
				try {
					await api.gitCheckout(gitScope, branch);
					await refresh();
				} catch (reason) {
					setCommitError(`${t("checkoutError")}: ${reason instanceof Error ? reason.message : String(reason)}`);
				} finally {
					setBusy(false);
				}
			};
			/** Run one destructive operation after the confirm modal, then refresh. */
			const runConfirmed = (confirmState) => {
				setConfirm({
					...confirmState,
					onConfirm: async () => {
						setBusy(true);
						setCommitError(null);
						try {
							await confirmState.onConfirm();
							await refresh();
						} catch (reason) {
							setCommitError(reason instanceof Error ? reason.message : String(reason));
						} finally {
							setBusy(false);
						}
					}
				});
			};
			/** Copy `text` to the clipboard (best-effort; no visual feedback needed — the menu closes). */
			const copy = (text) => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(text);
			};
			const openFileMenu = (event, entry, staged) => {
				event.preventDefault();
				event.stopPropagation();
				setFileMenu({
					entry,
					staged,
					x: event.clientX,
					y: event.clientY
				});
			};
			const changeGroupBy = (next) => {
				setGroupBy(next);
				try {
					localStorage.setItem(GROUP_BY_KEY, next);
				} catch {}
			};
			const stagedTree = (0, react.useMemo)(() => buildPathTree(stagedEntries), [stagedEntries]);
			const modifiedTree = (0, react.useMemo)(() => buildPathTree(modifiedEntries), [modifiedEntries]);
			const untrackedTree = (0, react.useMemo)(() => buildPathTree(untrackedEntries), [untrackedEntries]);
			const branchItems = (0, react.useMemo)(() => {
				const current = status?.branch;
				return (current !== void 0 && current !== "" && !branchNames.includes(current) ? [current, ...branchNames] : branchNames).map((name) => ({
					id: name,
					label: name
				}));
			}, [status?.branch, branchNames]);
			const renderEntry = (entry, staged, name = displayNameOf(entry.path, groupBy)) => {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.gitRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: sidebar_module_css_default.gitRowMain,
						title: entry.path,
						onClick: () => {
							openWorktreeDiff(entry, staged);
						},
						onDoubleClick: (event) => {
							event.preventDefault();
							event.stopPropagation();
							dockWorktreeDiff(entry, staged);
						},
						onContextMenu: (event) => {
							openFileMenu(event, entry, staged);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: badgeClassName(entry),
							children: badgeOf$1(entry)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: nameClassName(entry),
							children: name
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.iconButton,
						"aria-label": staged ? t("unstage") : t("stage"),
						title: staged ? t("unstage") : t("stage"),
						disabled: busy,
						onClick: () => {
							stageEntry(entry, staged);
						},
						children: staged ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
					})]
				}, `${staged ? "s" : "u"}:${entry.path}`);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.git,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitHeader,
						children: [
							repos.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								className: sidebar_module_css_default.gitPicker,
								open: repoPickerOpen,
								onClose: () => {
									setRepoPickerOpen(false);
								},
								portal: true,
								align: "start",
								selectedId: repoRoot,
								items: repos.map((repo) => ({
									id: repo.root,
									label: repo.rel === "." ? repo.name : `${repo.name} (${repo.rel})`
								})),
								onSelect: (id) => {
									setRepoPickerOpen(false);
									refresh(id);
								},
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitBranchSelect,
									"aria-label": t("gitRepo"),
									title: t("gitRepo"),
									"aria-haspopup": "menu",
									"aria-expanded": repoPickerOpen,
									disabled: busy,
									onClick: () => {
										setRepoPickerOpen((open) => !open);
									},
									children: repos.find((repo) => repo.root === repoRoot)?.rel === "." ? repos.find((repo) => repo.root === repoRoot)?.name : `${repos.find((repo) => repo.root === repoRoot)?.name ?? ""} (${repos.find((repo) => repo.root === repoRoot)?.rel ?? ""})`
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								className: sidebar_module_css_default.gitPicker,
								open: branchMenuOpen,
								onClose: () => {
									setBranchMenuOpen(false);
								},
								portal: true,
								align: "start",
								selectedId: status?.branch,
								items: branchItems,
								onSelect: (id) => {
									setBranchMenuOpen(false);
									checkout(id);
								},
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitBranchSelect,
									"aria-label": t("branch"),
									title: t("branch"),
									"aria-haspopup": "menu",
									"aria-expanded": branchMenuOpen,
									disabled: busy || status !== null && !status.isRepo,
									onClick: () => {
										setBranchMenuOpen((open) => !open);
									},
									children: status?.branch ?? t("branch")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								className: sidebar_module_css_default.gitGroupPicker,
								open: groupMenuOpen,
								onClose: () => {
									setGroupMenuOpen(false);
								},
								portal: true,
								align: "start",
								selectedId: groupBy,
								items: [
									{
										id: "none",
										label: t("groupByNone")
									},
									{
										id: "directory",
										label: t("groupByDirectory")
									},
									{
										id: "module",
										label: t("groupByModule")
									}
								],
								onSelect: (id) => {
									setGroupMenuOpen(false);
									changeGroupBy(id);
								},
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitGroupSelect,
									"aria-label": t("groupBy"),
									title: t("groupBy"),
									"aria-haspopup": "menu",
									"aria-expanded": groupMenuOpen,
									onClick: () => {
										setGroupMenuOpen((open) => !open);
									},
									children: groupBy === "none" ? t("groupByNone") : groupBy === "directory" ? t("groupByDirectory") : t("groupByModule")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.gitLink,
								onClick: openHistory,
								children: t("history")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								onClick: () => {
									refresh();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
							})
						]
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitPlaceholder,
						children: t("loading")
					}),
					!loading && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitError,
						children: error
					}),
					!loading && status !== null && !status.isRepo && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitPlaceholder,
						children: t("notRepo")
					}),
					status !== null && status.isRepo && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.gitEmpty,
							children: t("noChanges")
						}),
						stagedEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.gitSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.gitSectionHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									t("staged"),
									" (",
									stagedEntries.length,
									")"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitLink,
									disabled: busy,
									onClick: () => {
										unstageAll();
									},
									children: t("unstageAll")
								})]
							}), groupBy === "none" ? stagedEntries.map((entry) => renderEntry(entry, true)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitPathTree, {
								nodes: stagedTree,
								renderFile: (entry, name) => renderEntry(entry, true, name)
							})]
						}),
						modifiedEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.gitSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.gitSectionHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									t("modified"),
									" (",
									modifiedEntries.length,
									")"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitLink,
									disabled: busy,
									onClick: () => {
										stageTrackedAll();
									},
									children: t("stageAll")
								})]
							}), groupBy === "none" ? modifiedEntries.map((entry) => renderEntry(entry, false)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitPathTree, {
								nodes: modifiedTree,
								renderFile: (entry, name) => renderEntry(entry, false, name)
							})]
						}),
						untrackedEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.gitSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.gitSectionHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									t("untracked"),
									" (",
									untrackedEntries.length,
									")"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.gitLink,
									disabled: busy,
									onClick: () => {
										stageUntrackedAll();
									},
									children: t("addAll")
								})]
							}), groupBy === "none" ? untrackedEntries.map((entry) => renderEntry(entry, false)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitPathTree, {
								nodes: untrackedTree,
								renderFile: (entry, name) => renderEntry(entry, false, name)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.gitCommit,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: sidebar_module_css_default.gitCommitInput,
								placeholder: t("commitPlaceholder"),
								value: commitMsg,
								disabled: busy,
								onChange: (event) => {
									setCommitMsg(event.target.value);
									setCommitError(null);
								},
								onKeyDown: (event) => {
									if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.gitCommitButton,
								disabled: busy || commitMsg.trim() === "" || stagedEntries.length === 0,
								onClick: () => {
									commit();
								},
								children: t("commit")
							})]
						}),
						commitError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.gitError,
							children: commitError
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: fileMenu !== null,
							onClose: () => {
								setFileMenu(null);
							},
							items: [
								{
									id: "open",
									label: t("openEditor"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 })
								},
								fileMenu?.staged === true ? {
									id: "stage",
									label: t("unstage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
								} : {
									id: "stage",
									label: t("stage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 })
								},
								...fileMenu !== null && !isUntracked(fileMenu.entry) ? [{
									id: "discard",
									label: t("discard"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 }),
									danger: true
								}] : [],
								{
									type: "separator",
									id: "sep1"
								},
								{
									id: "relative",
									label: t("copyRelative"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								},
								{
									id: "absolute",
									label: t("copyAbsolute"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								}
							],
							onSelect: (id) => {
								const target = fileMenu;
								if (target === null) return;
								setFileMenu(null);
								if (id === "open") {
									onOpenFile(target.entry.path);
									return;
								}
								if (id === "stage") {
									stageEntry(target.entry, target.staged);
									return;
								}
								if (id === "discard") {
									runConfirmed({
										title: t("discardTitle"),
										description: t("discardDesc", { path: target.entry.path }),
										confirmLabel: t("discard"),
										onConfirm: () => api.gitDiscard(gitScope, target.entry.path)
									});
									return;
								}
								if (id === "relative") {
									copy(relativeTo(scope.cwd ?? "", target.entry.path));
									return;
								}
								if (id === "absolute") copy(target.entry.path);
							},
							portal: true,
							align: "start",
							getAnchorRect: () => fileMenu === null ? null : new DOMRect(fileMenu.x, fileMenu.y, 0, 0),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
							open: confirm !== null,
							onClose: () => {
								setConfirm(null);
							},
							title: confirm?.title ?? "",
							closeLabel: t("cancel"),
							footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setConfirm(null);
								},
								children: t("cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy,
								onClick: () => {
									const pending = confirm;
									if (pending === null) return;
									setConfirm(null);
									pending.onConfirm();
								},
								children: confirm?.confirmLabel ?? ""
							})] }),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: sidebar_module_css_default.gitConfirmDesc,
								children: confirm?.description
							})
						})
					] })
				]
			});
		}
		//#endregion
		//#region src/client/GitLogView.tsx
		/**
		* IDEA-style git log: a commit list on the left (subject / author / time)
		* and the selected commit's file tree + patch on the right. Opened as a
		* bottom-panel tab so the source-control sidebar stays a change list.
		*/
		init_clsx();
		init_TabBar();
		init_state();
		init_conversation_views();
		init_locales();
		init_sidebar_module_css();
		function fileBaseName(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		function commitFileTab(entry, path, repo) {
			return {
				id: `diff:c:${entry.hashFull}:${path}`,
				type: "diff",
				title: fileBaseName(path),
				diff: {
					kind: "commit",
					hash: entry.hash,
					hashFull: entry.hashFull,
					subject: entry.subject,
					path,
					repo
				}
			};
		}
		const LOG_BATCH = 40;
		const LIST_WIDTH_KEY = "dsh-sidebar:git-log-list-width";
		const LIST_WIDTH_MIN = 180;
		const LIST_WIDTH_MAX = 720;
		const LIST_WIDTH_DEFAULT = 520;
		const FILES_HEIGHT_KEY = "dsh-sidebar:git-log-files-height";
		const FILES_HEIGHT_MIN = 72;
		const FILES_HEIGHT_MAX = 480;
		const FILES_HEIGHT_DEFAULT = 160;
		function readStoredSize(key, min, max, fallback) {
			try {
				const stored = Number(localStorage.getItem(key));
				if (Number.isFinite(stored)) return Math.min(max, Math.max(min, Math.round(stored)));
			} catch {}
			return fallback;
		}
		function refNames(refs) {
			return [...new Set(refs.split(",").map((ref) => ref.trim()).filter((ref) => ref !== "").map((ref) => ref.includes(" -> ") ? ref.slice(ref.indexOf(" -> ") + 4) : ref).map((ref) => ref.startsWith("tag: ") ? ref.slice(5) : ref))];
		}
		/** Compact date for the log table: today → time, else `M/D HH:mm`. */
		function compactDate(iso) {
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return iso;
			const now = /* @__PURE__ */ new Date();
			const pad = (value) => String(value).padStart(2, "0");
			const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
			if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) return time;
			if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
			return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
		}
		function displayPath(path) {
			if (path === "/dev/null") return path;
			if (path.startsWith("a/") || path.startsWith("b/")) return path.slice(2);
			return path;
		}
		function fileKind(file) {
			if (file.oldPath === "/dev/null") return "add";
			if (file.newPath === "/dev/null") return "del";
			return displayPath(file.oldPath) !== displayPath(file.newPath) ? "ren" : "mod";
		}
		function fileNameClass(file) {
			const kind = fileKind(file);
			if (kind === "add") return `${sidebar_module_css_default.gitLogFileName} ${sidebar_module_css_default.gitAdded}`;
			if (kind === "del") return `${sidebar_module_css_default.gitLogFileName} ${sidebar_module_css_default.gitDeleted} ${sidebar_module_css_default.gitDeletedText}`;
			return `${sidebar_module_css_default.gitLogFileName} ${sidebar_module_css_default.gitModified}`;
		}
		function GitLogView(props) {
			const { scope, ctx, repo, store } = props;
			const [entries, setEntries] = (0, react.useState)([]);
			const [ended, setEnded] = (0, react.useState)(false);
			const [loading, setLoading] = (0, react.useState)(true);
			const [loadingMore, setLoadingMore] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [selected, setSelected] = (0, react.useState)(null);
			const [patch, setPatch] = (0, react.useState)("");
			const [patchLoading, setPatchLoading] = (0, react.useState)(false);
			const [fileFilter, setFileFilter] = (0, react.useState)(null);
			const [menu, setMenu] = (0, react.useState)(null);
			const [confirm, setConfirm] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [listWidth, setListWidth] = (0, react.useState)(() => readStoredSize(LIST_WIDTH_KEY, LIST_WIDTH_MIN, LIST_WIDTH_MAX, LIST_WIDTH_DEFAULT));
			const [filesHeight, setFilesHeight] = (0, react.useState)(() => readStoredSize(FILES_HEIGHT_KEY, FILES_HEIGHT_MIN, FILES_HEIGHT_MAX, FILES_HEIGHT_DEFAULT));
			const [dragging, setDragging] = (0, react.useState)(false);
			const [draggingFiles, setDraggingFiles] = (0, react.useState)(false);
			const drag = (0, react.useRef)({
				x: 0,
				width: LIST_WIDTH_DEFAULT
			});
			const filesDrag = (0, react.useRef)({
				y: 0,
				height: FILES_HEIGHT_DEFAULT
			});
			const listWidthRef = (0, react.useRef)(listWidth);
			const filesHeightRef = (0, react.useRef)(filesHeight);
			const setListWidthPersist = (next) => {
				listWidthRef.current = next;
				setListWidth(next);
			};
			const setFilesHeightPersist = (next) => {
				filesHeightRef.current = next;
				setFilesHeight(next);
			};
			const refresh = (0, react.useCallback)(async () => {
				setLoading(true);
				setError(null);
				try {
					const page = await api.gitLog(scope, LOG_BATCH, 0);
					setEntries(page);
					setEnded(page.length < LOG_BATCH);
					setSelected(page[0] ?? null);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setLoading(false);
				}
			}, [
				scope.sessionId,
				scope.cwd,
				scope.repo
			]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const loadMore = async () => {
				if (loadingMore || ended) return;
				setLoadingMore(true);
				try {
					const next = await api.gitLog(scope, LOG_BATCH, entries.length);
					setEntries((current) => [...current, ...next]);
					if (next.length < LOG_BATCH) setEnded(true);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setLoadingMore(false);
				}
			};
			(0, react.useEffect)(() => {
				if (selected === null) {
					setPatch("");
					setFileFilter(null);
					return;
				}
				let cancelled = false;
				setPatchLoading(true);
				setFileFilter(null);
				api.gitCommitDiff(scope, selected.hashFull).then((result) => {
					if (!cancelled) setPatch(result.diff);
				}, (reason) => {
					if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					if (!cancelled) setPatchLoading(false);
				});
				return () => {
					cancelled = true;
				};
			}, [
				scope.sessionId,
				scope.cwd,
				scope.repo,
				selected?.hashFull
			]);
			const files = (0, react.useMemo)(() => {
				return parseUnifiedDiff(patch).files.map((file) => {
					return {
						path: displayPath(file.newPath === "/dev/null" ? file.oldPath : file.newPath),
						file
					};
				});
			}, [patch]);
			const fileTree = (0, react.useMemo)(() => buildPathTree(files), [files]);
			const visiblePatch = (0, react.useMemo)(() => {
				if (fileFilter === null) return patch;
				return patch.split(/(?=^diff --git )/m).find((chunk) => chunk.includes(`b/${fileFilter}`) || chunk.includes(`a/${fileFilter}`)) ?? patch;
			}, [patch, fileFilter]);
			const runConfirmed = (next) => {
				setConfirm({
					...next,
					onConfirm: async () => {
						setBusy(true);
						try {
							await next.onConfirm();
							await refresh();
						} catch (reason) {
							setError(reason instanceof Error ? reason.message : String(reason));
						} finally {
							setBusy(false);
						}
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.gitLogPane,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitLogToolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.gitLogToolbarTitle,
							children: t("history")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("refresh"),
							title: t("refresh"),
							onClick: () => {
								refresh();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
						})]
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitPlaceholder,
						children: t("loading")
					}),
					!loading && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitError,
						children: error
					}),
					!loading && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitLogSplit,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.gitLogList,
								style: { width: listWidth },
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: sidebar_module_css_default.gitLogTableHead,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColSubject,
												children: t("historySubject")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColAuthor,
												children: t("historyAuthor")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColDate,
												children: t("historyDate")
											})
										]
									}),
									entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: entry.hashFull === selected?.hashFull ? `${sidebar_module_css_default.gitLogRow} ${sidebar_module_css_default.gitLogRowActive}` : sidebar_module_css_default.gitLogRow,
										title: `${entry.subject}\n${entry.author} · ${entry.date}\n${entry.hashFull}`,
										onClick: () => {
											setSelected(entry);
										},
										onContextMenu: (event) => {
											event.preventDefault();
											setMenu({
												entry,
												x: event.clientX,
												y: event.clientY
											});
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColSubject,
												children: entry.subject
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColAuthor,
												title: entry.author,
												children: entry.author
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: sidebar_module_css_default.gitLogColDate,
												children: compactDate(entry.date)
											})
										]
									}, entry.hashFull)),
									!ended && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: sidebar_module_css_default.gitLogMore,
										disabled: loadingMore,
										onClick: () => {
											loadMore();
										},
										children: loadingMore ? t("loading") : t("loadMore")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: clsx(sidebar_module_css_default.divider, sidebar_module_css_default.dividerRow, dragging && sidebar_module_css_default.dividerActive),
								onPointerDown: (event) => {
									event.preventDefault();
									event.currentTarget.setPointerCapture(event.pointerId);
									drag.current = {
										x: event.clientX,
										width: listWidthRef.current
									};
									setDragging(true);
								},
								onPointerMove: (event) => {
									if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
									const next = Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, Math.round(drag.current.width + (event.clientX - drag.current.x))));
									setListWidthPersist(next);
								},
								onPointerUp: (event) => {
									if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
									event.currentTarget.releasePointerCapture(event.pointerId);
									setDragging(false);
									try {
										localStorage.setItem(LIST_WIDTH_KEY, String(listWidthRef.current));
									} catch {}
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.gitLogDetail,
								children: [selected === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sidebar_module_css_default.gitPlaceholder,
									children: t("historyPick")
								}), selected !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: sidebar_module_css_default.gitLogFiles,
										style: { height: filesHeight },
										children: [files.length === 0 && !patchLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: sidebar_module_css_default.gitPlaceholder,
											children: t("historyNoFiles")
										}), files.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitPathTree, {
											nodes: fileTree,
											renderFile: (item, name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: fileFilter === item.path ? `${sidebar_module_css_default.gitLogFile} ${sidebar_module_css_default.gitLogFileActive}` : sidebar_module_css_default.gitLogFile,
												title: item.path,
												draggable: selected !== null,
												onDragStart: (event) => {
													if (selected === null) return;
													beginOpenTabDrag(event, commitFileTab(selected, item.path, repo));
												},
												onDragEnd: () => {
													setTabDragging(false);
												},
												onClick: () => {
													setFileFilter((current) => current === item.path ? null : item.path);
												},
												onDoubleClick: (event) => {
													event.preventDefault();
													if (selected === null || store === void 0) return;
													const tab = commitFileTab(selected, item.path, repo);
													const prefs = store.getPrefs();
													store.reduce((s) => dockTabToCenter(s, "seed", tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax));
													focusLatestCenterView(tab.title);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: fileNameClass(item.file),
													children: name
												})
											})
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: clsx(sidebar_module_css_default.divider, sidebar_module_css_default.dividerCol, draggingFiles && sidebar_module_css_default.dividerActive),
										onPointerDown: (event) => {
											event.preventDefault();
											event.currentTarget.setPointerCapture(event.pointerId);
											filesDrag.current = {
												y: event.clientY,
												height: filesHeightRef.current
											};
											setDraggingFiles(true);
										},
										onPointerMove: (event) => {
											if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
											const next = Math.min(FILES_HEIGHT_MAX, Math.max(FILES_HEIGHT_MIN, Math.round(filesDrag.current.height + (event.clientY - filesDrag.current.y))));
											setFilesHeightPersist(next);
										},
										onPointerUp: (event) => {
											if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
											event.currentTarget.releasePointerCapture(event.pointerId);
											setDraggingFiles(false);
											try {
												localStorage.setItem(FILES_HEIGHT_KEY, String(filesHeightRef.current));
											} catch {}
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: sidebar_module_css_default.gitLogPatch,
										children: [patchLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: sidebar_module_css_default.gitPlaceholder,
											children: t("loading")
										}), !patchLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffView, {
											ctx,
											sessionId: scope.sessionId,
											cwd: scope.cwd,
											diff: visiblePatch,
											onDragFile: selected === null ? void 0 : (event, path) => {
												beginOpenTabDrag(event, commitFileTab(selected, path, repo));
											},
											onOpenFileAbove: selected === null || store === void 0 ? void 0 : (path) => {
												const tab = commitFileTab(selected, path, repo);
												const prefs = store.getPrefs();
												store.reduce((s) => dockTabToCenter(s, "seed", tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax));
												focusLatestCenterView(tab.title);
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: sidebar_module_css_default.gitLogDetailFoot,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: sidebar_module_css_default.gitLogSubject,
												children: selected.subject
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: sidebar_module_css_default.gitLogMeta,
												children: [
													selected.hash,
													" · ",
													selected.author,
													" · ",
													selected.date
												]
											}),
											refNames(selected.refs).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: sidebar_module_css_default.gitLogRefs,
												children: refNames(selected.refs).map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: sidebar_module_css_default.gitLogRef,
													children: ref
												}, ref))
											})
										]
									})
								] })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: menu !== null,
						onClose: () => {
							setMenu(null);
						},
						items: [
							{
								id: "copyShort",
								label: t("copyShortHash"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							{
								id: "copyFull",
								label: t("copyFullHash"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							{
								id: "copySubject",
								label: t("copySubject"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							{
								type: "separator",
								id: "sep2"
							},
							{
								id: "revert",
								label: t("revertCommit"),
								danger: true
							},
							{
								id: "cherryPick",
								label: t("cherryPickCommit"),
								danger: true
							}
						],
						onSelect: (id) => {
							const target = menu;
							if (target === null) return;
							setMenu(null);
							if (id === "copyShort") {
								(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(target.entry.hash);
								return;
							}
							if (id === "copyFull") {
								(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(target.entry.hashFull);
								return;
							}
							if (id === "copySubject") {
								(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(target.entry.subject);
								return;
							}
							if (id === "revert") {
								runConfirmed({
									title: t("revertTitle"),
									description: t("revertDesc", { subject: target.entry.subject }),
									confirmLabel: t("revertCommit"),
									onConfirm: () => api.gitRevert(scope, target.entry.hashFull)
								});
								return;
							}
							if (id === "cherryPick") runConfirmed({
								title: t("cherryPickTitle"),
								description: t("cherryPickDesc", { subject: target.entry.subject }),
								confirmLabel: t("cherryPickCommit"),
								onConfirm: () => api.gitCherryPick(scope, target.entry.hashFull)
							});
						},
						portal: true,
						align: "start",
						getAnchorRect: () => menu === null ? null : new DOMRect(menu.x, menu.y, 0, 0),
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: confirm !== null,
						onClose: () => {
							setConfirm(null);
						},
						title: confirm?.title ?? "",
						closeLabel: t("cancel"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								setConfirm(null);
							},
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: busy,
							onClick: () => {
								const pending = confirm;
								if (pending === null) return;
								setConfirm(null);
								pending.onConfirm();
							},
							children: confirm?.confirmLabel ?? ""
						})] }),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: sidebar_module_css_default.gitConfirmDesc,
							children: confirm?.description
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/DiffTab.tsx
		/**
		* The diff tab: one change opened from the git panel, like VSCode's diff
		* editor. A worktree ref loads the file's unified diff (`git diff`, staged or
		* not; untracked files — which git diff never covers — render as a full-file
		* addition from their content), a commit ref loads the commit's full patch
		* (`git.show`-style). The header carries a refresh button because the tab
		* stays mounted while the git panel's staging/discard operations change the
		* very content it shows.
		*/
		init_locales();
		init_sidebar_module_css();
		function DiffTab(props) {
			const { sessionId, cwd, diff, ctx } = props;
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [data, setData] = (0, react.useState)(null);
			const [tick, setTick] = (0, react.useState)(0);
			const refresh = (0, react.useCallback)(() => {
				setTick((value) => value + 1);
			}, []);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const scope = {
					sessionId,
					cwd,
					repo: diff.repo
				};
				setLoading(true);
				setError(null);
				setData(null);
				const load = async () => {
					try {
						if (diff.kind === "commit") {
							const result = await api.gitCommitDiff(scope, diff.hashFull);
							const path = diff.path;
							const text = path === void 0 ? result.diff : result.diff.split(/(?=^diff --git )/m).find((chunk) => chunk.includes(`b/${path}`) || chunk.includes(`a/${path}`)) ?? result.diff;
							if (!cancelled) setData({ diff: text });
							return;
						}
						let result = await api.gitDiff(scope, diff.path, diff.staged);
						if (result.diff === "") {
							const other = await api.gitDiff(scope, diff.path, !diff.staged);
							if (other.diff !== "") result = other;
						}
						if (result.diff !== "") {
							if (!cancelled) setData({ diff: result.diff });
							return;
						}
						if (diff.untracked === true && !diff.staged) {
							const text = await api.fsRead(scope, diff.path);
							if (!cancelled) setData(text.kind === "text" ? {
								diff: "",
								untracked: text.content
							} : { diff: "" });
							return;
						}
						if (!cancelled) setData({ diff: "" });
					} catch (reason) {
						if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
					} finally {
						if (!cancelled) setLoading(false);
					}
				};
				load();
				return () => {
					cancelled = true;
				};
			}, [
				sessionId,
				cwd,
				diff,
				tick
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.gitDiffTab,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitDiffTabHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.gitDiffTabTitle,
							title: diff.kind === "worktree" ? diff.path : `${diff.hash} ${diff.subject}`,
							children: diff.kind === "worktree" ? diff.path : `${diff.hash} ${diff.subject}`
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("refresh"),
							title: t("refresh"),
							onClick: refresh,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
						})]
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitPlaceholder,
						children: t("loading")
					}),
					!loading && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitError,
						children: [
							t("diffLoadError"),
							": ",
							error
						]
					}),
					!loading && error === null && data !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [data.untracked !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffView, {
						ctx,
						sessionId,
						cwd,
						diff: "",
						untrackedPath: diff.kind === "worktree" ? diff.path : "",
						untrackedContent: data.untracked
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffView, {
						ctx,
						sessionId,
						cwd,
						diff: data.diff
					}), data.diff === "" && data.untracked === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitEmpty,
						children: t("diffEmpty")
					})] })
				]
			});
		}
		//#endregion
		//#region src/client/subagent-detect.ts
		/** Count the direct subagent children of one session (durable `origin` rows). */
		function directSubagentCount(byId, sessionId) {
			let count = 0;
			for (const summary of Object.values(byId)) if (summary.origin === "subagent" && summary.parentId === sessionId) count += 1;
			return count;
		}
		/**
		* The main agent of the current session's tree: walk the durable parent
		* chain upward until the first non-subagent session. The Subagent page shows
		* THIS root's full topology regardless of how deep the current selection is
		* (a session whose row is still hydrating, or a broken chain, degrades to
		* the session itself).
		*/
		function rootAncestor(byId, sessionId) {
			if (sessionId === void 0) return void 0;
			const seen = /* @__PURE__ */ new Set();
			let current = byId[sessionId];
			while (current !== void 0 && current.origin === "subagent" && current.parentId !== void 0 && !seen.has(current.id)) {
				seen.add(current.id);
				current = byId[current.parentId];
			}
			return current?.id ?? sessionId;
		}
		/**
		* Collect every catalog branch (an entry with `hasChildren`) reachable from
		* the root — the set of catalogs the always-expanded topology consumes.
		* Cycles fail soft.
		*/
		function collectBranchIds(catalogs, rootId) {
			const out = [];
			const seen = /* @__PURE__ */ new Set();
			const visit = (parentId) => {
				if (seen.has(parentId)) return;
				seen.add(parentId);
				for (const entry of catalogs[parentId]?.entries ?? []) if (entry.kind === "child" && entry.hasChildren) {
					out.push(entry.id);
					visit(entry.id);
				}
			};
			if (rootId !== void 0) visit(rootId);
			return out;
		}
		/**
		* Whether a new direct subagent appeared under `sessionId` between two
		* consecutive list snapshots (the count crossed 0 → >0). Switching to a
		* session that already has subagents yields `false` (its baseline starts at
		* the current count), so the auto-open never fights an existing layout.
		*/
		function detectNewDirectSubagent(prev, next, sessionId) {
			return directSubagentCount(prev.byId, sessionId) === 0 && directSubagentCount(next.byId, sessionId) > 0;
		}
		/**
		* Index every subagent descendant under each ancestor it reaches through an
		* uninterrupted subagent-origin chain (same semantics as the official
		* `indexSubagentDescendants`; cycles fail soft).
		*/
		function countSubagentDescendants(byId, sessionId) {
			const totals = {
				count: 0,
				runningCount: 0
			};
			for (const descendant of Object.values(byId)) {
				if (descendant.origin !== "subagent") continue;
				const seen = /* @__PURE__ */ new Set();
				let current = descendant;
				while (current?.origin === "subagent" && current.parentId !== void 0 && !seen.has(current.id)) {
					seen.add(current.id);
					if (current.parentId === sessionId) {
						totals.count += 1;
						if (descendant.running === true) totals.runningCount += 1;
						break;
					}
					current = byId[current.parentId];
				}
			}
			return totals;
		}
		//#endregion
		//#region src/client/subagent-activity.ts
		/**
		* Extract the concatenated plain text of a content-block list (the durable
		* `ContentBlock[]` shape, structurally: blocks with `type: 'text'` carry
		* `text`; anything else — tool_use, image, … — contributes nothing).
		* @param content - the raw `content` field of a message event.
		* @returns the joined text, or undefined when the message carries no text.
		*/
		function contentText(content) {
			if (!Array.isArray(content)) return void 0;
			const parts = [];
			for (const block of content) {
				if (block === null || typeof block !== "object") continue;
				const candidate = block;
				if (candidate.type === "text" && typeof candidate.text === "string") parts.push(candidate.text);
			}
			return parts.length > 0 ? parts.join("\n") : void 0;
		}
		/**
		* Fold a history tail into the last text output + last tool call (each is
		* the LAST occurrence in event order). Lifecycle events and raw
		* `assistant/chunk` rows are ignored — the card shows what the subagent is
		* doing right now, not its plumbing.
		* @param entries - the tail page from `subagent.history` (oldest → newest).
		* @returns the last text and/or tool call; an empty object when the tail has neither.
		*/
		function lastActivity(entries) {
			let text;
			let tool;
			for (const entry of entries) {
				const { type, data } = entry.event;
				if (type === "assistant/message") {
					const message = data.message;
					const extracted = contentText(message?.content);
					if (extracted !== void 0) text = extracted;
				} else if (type === "tool/call") tool = {
					name: typeof data.name === "string" ? data.name : "tool",
					args: typeof data.arguments === "string" ? data.arguments : ""
				};
			}
			if (text === void 0 && tool === void 0) return {};
			return {
				...text === void 0 ? {} : { text },
				...tool === void 0 ? {} : { tool }
			};
		}
		//#endregion
		//#region src/client/subagent-jobs.ts
		/** Whether the registry still holds the job open (its duration ticks). */
		function isJobLive(job) {
			return job.status === "running" || job.status === "stopping";
		}
		/**
		* Every session id of the topology tree rooted at `rootId` (the root plus
		* each session whose uninterrupted subagent-origin chain reaches it — same
		* lineage semantics as {@link countSubagentDescendants}; cycles fail soft).
		* Sessions outside the tree (orphans, other trees) are excluded, so the
		* jobs section never shows foreign work.
		*/
		function treeSessionIds(byId, rootId) {
			const ids = /* @__PURE__ */ new Set();
			if (rootId === void 0) return ids;
			for (const summary of Object.values(byId)) {
				const seen = /* @__PURE__ */ new Set();
				let current = summary;
				let reachesRoot = false;
				while (current !== void 0 && !seen.has(current.id)) {
					seen.add(current.id);
					if (current.id === rootId) {
						reachesRoot = true;
						break;
					}
					if (current.origin !== "subagent" || current.parentId === void 0) break;
					current = byId[current.parentId];
				}
				if (reachesRoot) ids.add(summary.id);
			}
			return ids;
		}
		/**
		* Whether a NEW background job appeared for one session between two
		* consecutive list snapshots (a job id the previous snapshot lacked).
		* Unlike the subagent auto-open (0 → N only), ANY new job id triggers: the
		* agent may start several jobs over a session, and each new one should
		* surface the Jobs page (a fresh page load never triggers — its baseline
		* starts at the current snapshot).
		*/
		function detectNewJob(prev, next, sessionId) {
			const prevIds = new Set((prev.jobsBySession?.[sessionId] ?? []).map((job) => job.id));
			return (next.jobsBySession?.[sessionId] ?? []).some((job) => !prevIds.has(job.id));
		}
		/**
		* Collect the background jobs of the whole current tree, owner-labeled.
		* Sessions without a mirror entry contribute nothing; an absent mirror
		* (runtime older than the jobs feed) yields an empty list.
		*/
		function collectTreeJobs(byId, jobsBySession, rootId) {
			const rows = [];
			if (jobsBySession === void 0) return rows;
			for (const sessionId of treeSessionIds(byId, rootId)) {
				const jobs = jobsBySession[sessionId];
				if (jobs === void 0 || jobs.length === 0) continue;
				const ownerTitle = byId[sessionId]?.displayTitle ?? sessionId;
				for (const job of jobs) rows.push({
					ownerSessionId: sessionId,
					ownerTitle,
					job
				});
			}
			return rows;
		}
		/**
		* Live rows first in start order, then settled rows newest-first (mirror of
		* the official ui-jobs ordering); a tie falls back to start order so the
		* sort never depends on the host's map iteration.
		*/
		function orderJobs(rows) {
			return [...rows].sort((left, right) => {
				const liveLeft = isJobLive(left.job);
				if (liveLeft !== isJobLive(right.job)) return liveLeft ? -1 : 1;
				if (liveLeft) return left.job.startedAt - right.job.startedAt;
				const finished = (right.job.finishedAt ?? right.job.startedAt) - (left.job.finishedAt ?? left.job.startedAt);
				return finished !== 0 ? finished : left.job.startedAt - right.job.startedAt;
			});
		}
		/**
		* Status marker semantics. `stopping` and `killed` share the attention
		* color: both mean the work ended (or is ending) on request rather than on
		* its own.
		*/
		function jobDotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "stopping": return "warning";
				case "completed": return "done";
				case "killed": return "warning";
				case "failed": return "error";
			}
		}
		/** Human status word of one wire status (localized through the passed translator). */
		function jobStatusLabel(status, t) {
			switch (status) {
				case "running": return t("jobStatusRunning");
				case "stopping": return t("jobStatusStopping");
				case "completed": return t("jobStatusCompleted");
				case "killed": return t("jobStatusKilled");
				case "failed": return t("jobStatusFailed");
			}
		}
		/**
		* Elapsed time in at most two adjacent units (mirror of the official
		* ui-jobs duration wording). A background job that outlives an hour is
		* already exceptional, so hours is the widest unit.
		*/
		function formatJobDuration(elapsedMs, t) {
			const total = Math.max(0, Math.floor(elapsedMs / 1e3));
			const seconds = total % 60;
			const minutes = Math.floor(total / 60) % 60;
			const hours = Math.floor(total / 3600);
			if (hours > 0) return t("jobDurationHours", {
				hours,
				minutes
			});
			if (minutes > 0) return t("jobDurationMinutes", {
				minutes,
				seconds
			});
			return t("jobDurationSeconds", { seconds });
		}
		//#endregion
		//#region src/client/icons.tsx
		/**
		* Terminal glyph in the app's outline style (1.5px stroke, currentColor):
		* a rounded frame with a prompt chevron and underscore cursor.
		*/
		const IconTerminalOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.5",
					y: "2.5",
					width: "13",
					height: "11",
					rx: "2",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4.5 6.25 6.75 8 4.5 9.75",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8.5 10.4h3",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				})
			]
		});
		/** History / log glyph: a clock with a tail (IDEA-style git log). */
		const IconHistoryOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8.5",
					r: "5",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8 6.25v2.5l1.75 1",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 3.25 2.25 5.25 4.5 6",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** Review glyph: a checklist on a file. */
		const IconReviewOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2",
					y: "1.5",
					width: "9.5",
					height: "13",
					rx: "1.5",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4.25 5.25h5M4.25 8h5M4.25 10.75h2.75",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m10.25 9.5 1.5 1.5 3-3",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** Diff glyph in the app's outline style: a file frame with a plus and a minus row. */
		const IconDiffOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.5",
					y: "1.5",
					width: "13",
					height: "13",
					rx: "2.5",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4 5h3M5.5 3.5v3",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 12.5h2.5",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				})
			]
		});
		/**
		* Stop glyph for the background-job kill button: a filled square in the
		* app's outline scale (16), the universal "halt this work" mark.
		*/
		const IconStopOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "4",
				y: "4",
				width: "8",
				height: "8",
				rx: "1.5",
				fill: "currentColor",
				stroke: "none"
			})
		});
		/** Image viewer glyph: a picture frame with a sun and a mountain. */
		const IconImageOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.5",
					y: "2.5",
					width: "13",
					height: "11",
					rx: "2",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "5.5",
					cy: "6",
					r: "1.2",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m3.5 12 3-3 2.25 2.25L11.5 8.5 13 10.5",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** PDF viewer glyph: a document frame with the "PDF" label. */
		const IconPdfOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 1.5h6.5L13.5 5v9.5h-10z",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 1.5V5h4",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5 13.5v-3h1.4c.75 0 1.1.32 1.1.85 0 .54-.35.85-1.1.85H5.3",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8.3 13.5v-3h1.05c.8 0 1.35.5 1.35 1.5s-.55 1.5-1.35 1.5z",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M11.6 13.5v-3h1.3",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round"
				})
			]
		});
		/** Markdown viewer glyph: the classic "M with a down arrow" badge. */
		const IconMarkdownOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "1.5",
				y: "2.5",
				width: "13",
				height: "11",
				rx: "2",
				stroke: "currentColor",
				strokeWidth: "1.5"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M4 10.5V5.5l2 2.5 2-2.5v5M9.5 10.5v-5l2 2.5 2-2.5v5",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})]
		});
		/** HTML viewer glyph: a document frame with a "‹/›" tag pair. */
		const IconHtmlOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 1.5h6.5L13.5 5v9.5h-10z",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 1.5V5h4",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5.6 13.2 4.2 10l1.4-3.2M7.4 6.8 8.8 10l-1.4 3.2",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** Browser tab glyph: a globe with meridians. */
		const IconGlobeOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8",
					r: "6.5",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
					cx: "8",
					cy: "8",
					rx: "2.8",
					ry: "6.5",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M1.5 8h13M8 1.5c-2.4 1.8-2.4 11.2 0 13M8 1.5c2.4 1.8 2.4 11.2 0 13",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				})
			]
		});
		//#endregion
		//#region \0dsh-css:/Users/laiweibin/work/workSoftware/dhs-plugins/dsh-better-sidebar/src/client/SubagentView.module.css.mjs
		const css$2 = ".hxfcFa_subagent{flex-direction:column;flex:1;min-height:0;display:flex}.hxfcFa_subagentHeader{flex:none;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.hxfcFa_subagentTitle{min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.hxfcFa_subagentCount{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.hxfcFa_subagentRefresh{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;display:inline-flex}.hxfcFa_subagentRefresh:hover{background:var(--dsw-alias-interactive-bg-hover)}.hxfcFa_subagentBody{flex:1;min-height:0;padding:2px 6px 8px;overflow-y:auto}.hxfcFa_subagentRow{box-sizing:border-box;width:100%;min-height:50px;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;outline:none;align-items:flex-start;gap:8px;padding:7px 8px 7px 11px;display:flex;position:relative}.hxfcFa_subagentRow:hover,.hxfcFa_subagentRow:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.hxfcFa_subagentRowActive,.hxfcFa_subagentRowActive:hover,.hxfcFa_subagentRowActive:focus-visible{background:var(--dsw-alias-interactive-bg-active)}.hxfcFa_subagentRowDisabled{color:var(--dsw-alias-label-dimmed);cursor:not-allowed}.hxfcFa_subagentRowDisabled:hover{background:0 0}.hxfcFa_subagentRowLoading{cursor:default}.hxfcFa_subagentDot{margin-top:4px}.hxfcFa_subagentContent{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.hxfcFa_subagentLabel,.hxfcFa_subagentSecondary{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.hxfcFa_subagentLabel{color:inherit;font-weight:400}.hxfcFa_subagentSecondary{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.hxfcFa_subagentLive{min-width:0;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);align-items:baseline;gap:4px;display:flex;overflow:hidden}.hxfcFa_subagentLiveTool{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-secondary);flex:none}.hxfcFa_subagentLiveArgs{min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.hxfcFa_subagentLiveText{-webkit-line-clamp:2;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.hxfcFa_subagentNode{min-width:0;position:relative}.hxfcFa_subagentChildren{margin-left:18px;padding-left:4px;position:relative}.hxfcFa_subagentChildren:before{content:\"\";border-left:1px solid var(--dsw-alias-border-l2);height:26px;position:absolute;top:-26px;left:0}.hxfcFa_subagentChildren[aria-busy=true]:before{content:none}.hxfcFa_subagentChildren>.hxfcFa_subagentNode:before{content:\"\";border-left:1px solid var(--dsw-alias-border-l2);position:absolute;top:0;bottom:0;left:-4px}.hxfcFa_subagentChildren>.hxfcFa_subagentNode:last-child:before{height:17px;bottom:auto}.hxfcFa_subagentChildren>.hxfcFa_subagentNode>.hxfcFa_subagentRow:before{content:\"\";border-top:1px solid var(--dsw-alias-border-l2);width:14px;position:absolute;top:16px;left:-4px}.hxfcFa_subagentEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;flex-direction:column;gap:2px;padding:16px;display:flex}.hxfcFa_subagentEmptyHint{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-dimmed)}.hxfcFa_subagentError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;display:flex}.hxfcFa_subagentErrorRetry{height:24px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;align-items:center;gap:4px;padding:0 8px;display:inline-flex}.hxfcFa_subagentErrorRetry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.hxfcFa_jobs{border-top:1px solid var(--dsw-alias-border-l2);margin-top:10px;padding-top:8px}.hxfcFa_jobsHeader{align-items:center;gap:8px;height:26px;padding:0 2px;display:flex}.hxfcFa_jobsTitle{min-width:0;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.hxfcFa_jobsCount{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.hxfcFa_jobsList{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.hxfcFa_jobsRow{border-radius:8px;align-items:center;gap:4px;display:flex}.hxfcFa_jobsRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.hxfcFa_jobsRowSettled{opacity:.8}.hxfcFa_jobsRowSelected,.hxfcFa_jobsRowSelected:hover{background:var(--dsw-alias-interactive-bg-active)}.hxfcFa_jobsRowMain{min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;outline:none;flex:1;align-items:flex-start;gap:8px;padding:6px 8px 6px 11px;display:flex}.hxfcFa_jobsRowMain:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.hxfcFa_jobsDot{margin-top:5px}.hxfcFa_jobsContent{flex-direction:column;gap:1px;min-width:0;display:flex}.hxfcFa_jobsLabelLine{align-items:center;gap:6px;min-width:0;display:flex}.hxfcFa_jobsKind{text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--dsw-alias-border-l2);max-width:90px;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);border-radius:4px;flex:none;padding:0 5px;line-height:14px;overflow:hidden}.hxfcFa_jobsLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.hxfcFa_jobsSecondary{text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);overflow:hidden}.hxfcFa_jobsKill{width:22px;height:22px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;margin-right:4px;display:inline-flex}.hxfcFa_jobsKill:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary)}.hxfcFa_jobsKillArmed,.hxfcFa_jobsKillArmed:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);width:auto;height:20px;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxxs-strong-11);white-space:nowrap;padding:0 8px}.hxfcFa_jobsKill:disabled{opacity:.5;cursor:default}.hxfcFa_jobsKillError{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-error-primary);flex:none;margin-right:4px}.hxfcFa_jobsPane{z-index:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;margin-top:4px;position:sticky;bottom:0;overflow:hidden;box-shadow:0 -6px 12px -8px #00000059}.hxfcFa_jobsPaneHeader{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;height:28px;padding:0 4px 0 10px;display:flex}.hxfcFa_jobsPaneDot{flex:none}.hxfcFa_jobsPaneLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.hxfcFa_jobsPaneStatus{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.hxfcFa_jobsPaneClose{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:5px;flex:none;justify-content:center;align-items:center;display:inline-flex}.hxfcFa_jobsPaneClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.hxfcFa_jobsPanePre{max-height:200px;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;margin:0;padding:6px 10px;line-height:1.5;overflow:auto}.hxfcFa_jobsPaneHint{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);padding:8px 10px}.hxfcFa_jobsPaneError{color:var(--dsw-alias-state-error-primary)}";
		const tagId$2 = "dsh-external/dsh-better-sidebar/SubagentView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-external/dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var SubagentView_module_css_default = {
			"jobsPaneClose": "hxfcFa_jobsPaneClose",
			"subagentHeader": "hxfcFa_subagentHeader",
			"jobsRowMain": "hxfcFa_jobsRowMain",
			"subagentLiveTool": "hxfcFa_subagentLiveTool",
			"jobsRowSettled": "hxfcFa_jobsRowSettled",
			"jobsKillArmed": "hxfcFa_jobsKillArmed",
			"subagentRefresh": "hxfcFa_subagentRefresh",
			"subagentErrorRetry": "hxfcFa_subagentErrorRetry",
			"jobsContent": "hxfcFa_jobsContent",
			"jobsLabelLine": "hxfcFa_jobsLabelLine",
			"subagentRowActive": "hxfcFa_subagentRowActive",
			"jobsTitle": "hxfcFa_jobsTitle",
			"subagentTitle": "hxfcFa_subagentTitle",
			"subagentSecondary": "hxfcFa_subagentSecondary",
			"jobsCount": "hxfcFa_jobsCount",
			"jobsKill": "hxfcFa_jobsKill",
			"jobsPaneHeader": "hxfcFa_jobsPaneHeader",
			"jobsPaneLabel": "hxfcFa_jobsPaneLabel",
			"subagentCount": "hxfcFa_subagentCount",
			"jobsHeader": "hxfcFa_jobsHeader",
			"subagentRowDisabled": "hxfcFa_subagentRowDisabled",
			"subagentChildren": "hxfcFa_subagentChildren",
			"jobsRowSelected": "hxfcFa_jobsRowSelected",
			"subagentLiveText": "hxfcFa_subagentLiveText",
			"jobsRow": "hxfcFa_jobsRow",
			"subagent": "hxfcFa_subagent",
			"subagentBody": "hxfcFa_subagentBody",
			"subagentRow": "hxfcFa_subagentRow",
			"subagentContent": "hxfcFa_subagentContent",
			"jobsLabel": "hxfcFa_jobsLabel",
			"jobsSecondary": "hxfcFa_jobsSecondary",
			"subagentLiveArgs": "hxfcFa_subagentLiveArgs",
			"subagentNode": "hxfcFa_subagentNode",
			"subagentError": "hxfcFa_subagentError",
			"jobsDot": "hxfcFa_jobsDot",
			"jobsList": "hxfcFa_jobsList",
			"jobsPaneDot": "hxfcFa_jobsPaneDot",
			"jobsPaneStatus": "hxfcFa_jobsPaneStatus",
			"subagentDot": "hxfcFa_subagentDot",
			"jobsKillError": "hxfcFa_jobsKillError",
			"subagentLabel": "hxfcFa_subagentLabel",
			"subagentEmptyHint": "hxfcFa_subagentEmptyHint",
			"subagentEmpty": "hxfcFa_subagentEmpty",
			"subagentLive": "hxfcFa_subagentLive",
			"jobs": "hxfcFa_jobs",
			"jobsPanePre": "hxfcFa_jobsPanePre",
			"subagentRowLoading": "hxfcFa_subagentRowLoading",
			"jobsPane": "hxfcFa_jobsPane",
			"jobsPaneHint": "hxfcFa_jobsPaneHint",
			"jobsKind": "hxfcFa_jobsKind",
			"jobsPaneError": "hxfcFa_jobsPaneError"
		};
		//#endregion
		//#region src/client/SubagentView.tsx
		/**
		* Subagent page: the FULL agent topology of the current tree's main session.
		*
		* The root is resolved by walking the durable parent chain upward from the
		* current session to the first non-subagent session — the MAIN session — and
		* every subagent under it shares this one topology view, no matter how deep
		* the current selection is (including a subagent transcript opened in the
		* main view). The main agent renders as the root node card (click it to jump
		* back to the main session), with its subagents hanging below it in clearly
		* LAYERED levels: tree connector lines (first level included) and per-level
		* indentation show the hierarchy, and the currently-open session is
		* highlighted in place. Every branch is expanded automatically (lazy
		* catalogs hydrate on demand and consume live membership while visible).
		*
		* Each node card carries live status (state dot, durable label, mode and
		* activity); while a child RUNS, its card additionally shows the LAST text
		* output and LAST tool call pulled from its history tail, auto-refreshing
		* every few seconds while the page is visible. Clicking a card jumps
		* straight into the child transcript (`openSubagent`); the page stays open
		* and the topology remains rooted at the main session.
		*/
		init_clsx();
		init_locales();
		/** Refresh cadence of the live "last text + tool call" lines while a child runs. */
		const POLL_MS = 3e3;
		/** Preview cap of one tool-call argument line. */
		const ARGS_PREVIEW = 60;
		/** Refresh cadence of an expanded job-output panel while its job runs. */
		const JOB_POLL_MS = 2e3;
		/** How long the kill button stays armed before it needs re-confirming. */
		const JOB_KILL_ARM_MS = 3e3;
		/** The direct subagent children of one parent (durable `origin` rows). */
		function directChildren(byId, parentSessionId) {
			return Object.values(byId).filter((summary) => summary.origin === "subagent" && summary.parentId === parentSessionId);
		}
		/** Human label of one catalog child: durable label, then summary title, then id. */
		function childLabel(entry, summary) {
			return entry.label ?? summary?.displayTitle ?? entry.id;
		}
		function diagnosticReason(entry) {
			switch (entry.reason) {
				case "corrupt": return t("subagentDiagCorrupt");
				case "unsupported": return t("subagentDiagUnsupported");
				case "unavailable": return t("subagentDiagUnavailable");
			}
		}
		/** The secondary line of one card: title · mode · activity (skips empty parts). */
		function cardSecondary(summary, entry) {
			return [
				summary?.displayTitle,
				entry.mode === "one-shot" ? t("subagentModeOneShot") : t("subagentModeContinuable"),
				entry.activity === "running" ? t("subagentRunning") : t("subagentInactive")
			].filter(Boolean).join(" · ");
		}
		/** First `limit` characters with an ellipsis when truncated. */
		function preview(text, limit) {
			return text.length > limit ? `${text.slice(0, limit)}…` : text;
		}
		/** Collapse whitespace for the single-paragraph live-text preview. */
		function flatten(text) {
			return text.replace(/\s+/g, " ").trim();
		}
		/** Disabled "loading…" cards backed by the summary mirror while a catalog hydrates. */
		function CatalogLoadingRows(props) {
			const { parentSessionId, byId, level } = props;
			const children = directChildren(byId, parentSessionId);
			if (children.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SubagentView_module_css_default.subagentEmpty,
				children: t("loading")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: children.map((summary) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "treeitem",
				"aria-disabled": "true",
				"aria-level": level,
				"aria-label": t("loading"),
				className: `${SubagentView_module_css_default.subagentRow} ${SubagentView_module_css_default.subagentRowDisabled} ${SubagentView_module_css_default.subagentRowLoading}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: summary.running === true ? "ongoing" : "done",
					className: SubagentView_module_css_default.subagentDot
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentContent,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.subagentLabel,
						children: t("loading")
					})
				})]
			}, summary.id)) });
		}
		/**
		* The live lines of one RUNNING subagent card: the last text output and the
		* last tool call of the child's history tail, refreshed every few seconds
		* while the page is visible. Idle cards render nothing (a quiet topology); a
		* running child with neither output yet reads "thinking…".
		*/
		function SubagentLiveLines(props) {
			const { ctx, parentSessionId, childSessionId, mode, running, active } = props;
			const [live, setLive] = (0, react.useState)({});
			const controllerRef = (0, react.useRef)(void 0);
			const address = (0, react.useMemo)(() => ({
				parentSessionId,
				childSessionId,
				mode
			}), [
				parentSessionId,
				childSessionId,
				mode
			]);
			const load = (0, react.useCallback)(async () => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				try {
					const response = await ctx.connection.api.subagents.history({
						...address,
						maxMessages: 12
					}, controller.signal);
					if (!response.result.ok) return;
					setLive(lastActivity(response.result.value.events));
				} catch {}
			}, [ctx, address]);
			(0, react.useEffect)(() => {
				if (!active) return;
				load();
				if (!running) return;
				const timer = window.setInterval(() => {
					load();
				}, POLL_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, [
				load,
				running,
				active
			]);
			(0, react.useEffect)(() => () => {
				controllerRef.current?.abort();
			}, []);
			if (!running) return null;
			if (live.text === void 0 && live.tool === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SubagentView_module_css_default.subagentLive,
				children: t("subagentThinking")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [live.tool !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SubagentView_module_css_default.subagentLive,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentLiveTool,
					children: live.tool.name
				}), live.tool.args !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentLiveArgs,
					children: preview(live.tool.args, ARGS_PREVIEW)
				})]
			}), live.text !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SubagentView_module_css_default.subagentLiveText,
				children: flatten(live.text)
			})] });
		}
		/** Render one topology level; branches are always expanded (lazy catalogs). */
		function CatalogRows({ parentSessionId, catalog, catalogs, byId, level, currentSessionId, active, ctx, openChild, refresh }) {
			const emptyLoading = catalog?.state === "loading" && catalog.entries.length === 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				emptyLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
					parentSessionId,
					byId,
					level
				}),
				catalog?.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.subagentError,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: catalog.error?.message ?? t("error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SubagentView_module_css_default.subagentErrorRetry,
						onClick: () => {
							refresh(parentSessionId);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {}), t("retry")]
					})]
				}),
				(catalog?.entries ?? []).map((entry) => {
					if (entry.kind === "diagnostic") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.subagentNode,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "treeitem",
							"aria-disabled": "true",
							"aria-level": level,
							className: `${SubagentView_module_css_default.subagentRow} ${SubagentView_module_css_default.subagentRowDisabled}`,
							title: diagnosticReason(entry),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: "error",
								className: SubagentView_module_css_default.subagentDot
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.subagentContent,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.subagentLabel,
									children: entry.id
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.subagentSecondary,
									children: diagnosticReason(entry)
								})]
							})]
						})
					}, entry.id);
					const childCatalog = catalogs[entry.id];
					const knownLeaf = !entry.hasChildren;
					const summary = byId[entry.id];
					const label = childLabel(entry, summary);
					const secondary = cardSecondary(summary, entry);
					const childLoading = childCatalog === void 0 || childCatalog.state === "loading" && childCatalog.entries.length === 0;
					const address = {
						parentSessionId,
						childSessionId: entry.id,
						mode: entry.mode
					};
					const current = entry.id === currentSessionId;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SubagentView_module_css_default.subagentNode,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "treeitem",
							tabIndex: 0,
							"aria-level": level,
							"aria-label": `${label} ${secondary}`,
							"aria-current": current ? "true" : void 0,
							...knownLeaf ? {} : { "aria-expanded": true },
							className: clsx(SubagentView_module_css_default.subagentRow, current && SubagentView_module_css_default.subagentRowActive),
							onClick: () => {
								openChild(address);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									event.stopPropagation();
									openChild(address);
								}
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: entry.activity === "running" ? "ongoing" : "done",
								className: SubagentView_module_css_default.subagentDot
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.subagentContent,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentLabel,
										children: label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentSecondary,
										children: secondary
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentLiveLines, {
										ctx,
										parentSessionId,
										childSessionId: entry.id,
										mode: entry.mode,
										running: entry.activity === "running",
										active
									})
								]
							})]
						}), !knownLeaf && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "group",
							className: SubagentView_module_css_default.subagentChildren,
							"aria-busy": childLoading || void 0,
							children: childCatalog === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
								parentSessionId: entry.id,
								byId,
								level: level + 1
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogRows, {
								parentSessionId: entry.id,
								catalog: childCatalog,
								catalogs,
								byId,
								level: level + 1,
								currentSessionId,
								active,
								ctx,
								openChild,
								refresh
							})
						})]
					}, entry.id);
				})
			] });
		}
		/**
		* The shared output dock of the jobs section: ONE pane at the bottom of the
		* sidebar body (sticky, terminal-like) shows the SELECTED job's output as
		* the MODEL has read it so far (replayed from the owner session's event
		* log), refreshed every {@link JOB_POLL_MS} while the job runs and the
		* page is visible. The model's `job_output` cursor is never touched — the
		* pane can never steal the agent's bytes, and it stays empty until the
		* agent reads the job. A single dock — not a panel per row — keeps the
		* job list compact and stable when many jobs are running.
		*/
		function JobOutputPane(props) {
			const { ownerSessionId, job, active, onClose } = props;
			const [state, setState] = (0, react.useState)("loading");
			const controllerRef = (0, react.useRef)(void 0);
			const preRef = (0, react.useRef)(null);
			const load = (0, react.useCallback)(async () => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				try {
					const result = await api.jobOutput({ sessionId: ownerSessionId }, job.id, controller.signal);
					setState(result);
				} catch {
					setState((current) => current === "loading" ? "error" : current);
				}
			}, [ownerSessionId, job.id]);
			(0, react.useEffect)(() => {
				load();
				if (!active || !isJobLive(job)) return;
				const timer = window.setInterval(() => {
					load();
				}, JOB_POLL_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, [
				load,
				active,
				job.status
			]);
			(0, react.useEffect)(() => () => {
				controllerRef.current?.abort();
			}, []);
			(0, react.useEffect)(() => {
				if (!isJobLive(job) || typeof state !== "object" || state.text.length === 0) return;
				const pre = preRef.current;
				if (pre !== null) pre.scrollTop = pre.scrollHeight;
			}, [state, job.status]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SubagentView_module_css_default.jobsPane,
				role: "region",
				"aria-label": `${job.label} ${t("jobs")}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SubagentView_module_css_default.jobsPaneHeader,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: jobDotState(job.status),
								className: SubagentView_module_css_default.jobsPaneDot
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SubagentView_module_css_default.jobsPaneLabel,
								title: job.label,
								children: job.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.jobsPaneStatus,
								children: [jobStatusLabel(job.status, t), job.detail !== void 0 && job.detail !== "" ? ` · ${job.detail}` : ""]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SubagentView_module_css_default.jobsPaneClose,
								"aria-label": t("close"),
								title: t("close"),
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconStopOutline16, { size: 10 })
							})
						]
					}),
					state === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("loading")
					}),
					state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: `${SubagentView_module_css_default.jobsPaneHint} ${SubagentView_module_css_default.jobsPaneError}`,
						children: t("jobOutputError")
					}),
					typeof state === "object" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.text.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						ref: preRef,
						className: SubagentView_module_css_default.jobsPanePre,
						children: state.text
					}) : state.read ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobNoOutput")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobNotReadYet")
					}), state.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobOutputTruncated")
					})] })
				]
			});
		}
		/**
		* The background-job section of the Subagent page: every job of the whole
		* current tree (main agent + subagents, owner-labeled), fed by the harness
		* `session/jobs` push mirror. Clicking a row feeds its model-read output to
		* the shared bottom dock (event replay — never the model's cursor); live
		* rows carry a two-click-confirm kill button. Renders nothing while the
		* tree has no jobs.
		*/
		function JobsSection(props) {
			const { byId, jobsBySession, rootId, active } = props;
			const rows = (0, react.useMemo)(() => orderJobs(collectTreeJobs(byId, jobsBySession, rootId)), [
				byId,
				jobsBySession,
				rootId
			]);
			const [selectedId, setSelectedId] = (0, react.useState)(void 0);
			const [armedId, setArmedId] = (0, react.useState)(void 0);
			const [killingId, setKillingId] = (0, react.useState)(void 0);
			const [killErrorId, setKillErrorId] = (0, react.useState)(void 0);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const selectedRow = (0, react.useMemo)(() => selectedId === void 0 ? void 0 : rows.find((row) => row.job.id === selectedId), [rows, selectedId]);
			const liveCount = (0, react.useMemo)(() => rows.reduce((count, row) => count + (isJobLive(row.job) ? 1 : 0), 0), [rows]);
			const multiOwner = (0, react.useMemo)(() => new Set(rows.map((row) => row.ownerSessionId)).size > 1, [rows]);
			(0, react.useEffect)(() => {
				if (armedId === void 0) return;
				const timer = window.setTimeout(() => {
					setArmedId(void 0);
				}, JOB_KILL_ARM_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [armedId]);
			(0, react.useEffect)(() => {
				if (liveCount === 0) return;
				setNow(Date.now());
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					window.clearInterval(timer);
				};
			}, [liveCount]);
			(0, react.useEffect)(() => {
				if (selectedId !== void 0 && selectedRow === void 0) setSelectedId(void 0);
			}, [selectedId, selectedRow]);
			const kill = (0, react.useCallback)(async (row) => {
				setKillingId(row.job.id);
				setKillErrorId(void 0);
				try {
					await api.jobKill({ sessionId: row.ownerSessionId }, row.job.id);
				} catch {
					setKillErrorId(row.job.id);
				} finally {
					setKillingId(void 0);
					setArmedId(void 0);
				}
			}, []);
			if (rows.length === 0) return null;
			const countLabel = liveCount > 0 ? t("jobsCountRunning", {
				count: rows.length,
				running: liveCount
			}) : t("jobsCount", { count: rows.length });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SubagentView_module_css_default.jobs,
				"aria-label": t("jobs"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.jobsHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.jobsTitle,
						children: t("jobs")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.jobsCount,
						children: countLabel
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: SubagentView_module_css_default.jobsList,
					"aria-label": t("jobs"),
					children: rows.map((row) => {
						const { job } = row;
						const live = isJobLive(job);
						const selected = selectedId === job.id;
						const armed = armedId === job.id;
						const killing = killingId === job.id;
						const killFailed = killErrorId === job.id;
						const elapsed = live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt;
						const secondary = [
							...multiOwner ? [row.ownerTitle] : [],
							jobStatusLabel(job.status, t),
							...job.detail !== void 0 && job.detail !== "" ? [job.detail] : [],
							formatJobDuration(elapsed, t)
						].filter(Boolean).join(" · ");
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: clsx(SubagentView_module_css_default.jobsRow, !live && SubagentView_module_css_default.jobsRowSettled, selected && SubagentView_module_css_default.jobsRowSelected),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: SubagentView_module_css_default.jobsRowMain,
									"aria-pressed": selected,
									"aria-label": `${job.label} ${secondary}`,
									onClick: () => {
										setSelectedId(selected ? void 0 : job.id);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: jobDotState(job.status),
										className: SubagentView_module_css_default.jobsDot
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: SubagentView_module_css_default.jobsContent,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: SubagentView_module_css_default.jobsLabelLine,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SubagentView_module_css_default.jobsKind,
												children: job.kind
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SubagentView_module_css_default.jobsLabel,
												title: job.label,
												children: job.label
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SubagentView_module_css_default.jobsSecondary,
											children: secondary
										})]
									})]
								}),
								job.status === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: armed ? `${SubagentView_module_css_default.jobsKill} ${SubagentView_module_css_default.jobsKillArmed}` : SubagentView_module_css_default.jobsKill,
									"aria-label": armed ? t("jobKillConfirm") : t("jobKill"),
									title: armed ? t("jobKillConfirm") : t("jobKill"),
									disabled: killing,
									onClick: (event) => {
										event.stopPropagation();
										if (armed) kill(row);
										else setArmedId(job.id);
									},
									children: armed ? t("jobKillConfirm") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconStopOutline16, { size: 12 })
								}),
								killFailed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.jobsKillError,
									children: t("jobKillError")
								})
							]
						}, job.id);
					})
				})]
			}), selectedRow !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobOutputPane, {
				ownerSessionId: selectedRow.ownerSessionId,
				job: selectedRow.job,
				active,
				onClose: () => {
					setSelectedId(void 0);
				}
			})] });
		}
		/**
		* The sidebar's Subagent topology page.
		* @param props - current session id, whether the page is actually visible
		*   (active tab + open panel), the client context, and an optional
		*   jump-notify hook fired right before `openSubagent` (lets the sidebar
		*   shell re-open the Subagent page after the conversation switch lands on
		*   the child session).
		* @returns the main agent's topology tree, or the empty/error/loading states.
		*/
		function SubagentView(props) {
			const { sessionId, active, ctx, onOpenChild } = props;
			const sessions = ctx.sessions;
			const list = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => sessions.list.subscribe(callback), [sessions]), (0, react.useCallback)(() => sessions.list.getSnapshot(), [sessions]));
			const byId = list.byId;
			const catalogs = list.subagentsByParent ?? {};
			const rootId = (0, react.useMemo)(() => rootAncestor(byId, sessionId), [byId, sessionId]);
			const rootCatalog = rootId === void 0 ? void 0 : catalogs[rootId];
			const rootSummary = rootId === void 0 ? void 0 : byId[rootId];
			/** Catalog owners currently consuming live membership updates. */
			const observedRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const observe = (0, react.useCallback)((parentSessionId, open) => {
				sessions.setSubagentCatalogOpen?.(parentSessionId, open);
				if (open) observedRef.current.add(parentSessionId);
				else observedRef.current.delete(parentSessionId);
			}, [sessions]);
			(0, react.useEffect)(() => {
				if (rootId === void 0 || !active) return;
				observe(rootId, true);
				return () => {
					for (const parentSessionId of observedRef.current) sessions.setSubagentCatalogOpen?.(parentSessionId, false);
					observedRef.current.clear();
				};
			}, [
				rootId,
				active,
				observe,
				sessions
			]);
			const branches = (0, react.useMemo)(() => collectBranchIds(catalogs, rootId), [catalogs, rootId]);
			(0, react.useEffect)(() => {
				if (!active) return;
				for (const id of branches) if (!observedRef.current.has(id)) observe(id, true);
			}, [
				branches,
				active,
				observe
			]);
			(0, react.useEffect)(() => () => {
				for (const parentSessionId of observedRef.current) sessions.setSubagentCatalogOpen?.(parentSessionId, false);
				observedRef.current.clear();
			}, [sessions]);
			const openChild = (0, react.useCallback)((address) => {
				onOpenChild?.(address);
				try {
					sessions.openSubagent?.(address);
				} catch (error) {
					console.warn("[dsh-better-sidebar] openSubagent failed:", error);
				}
			}, [sessions, onOpenChild]);
			/** Jump back to the main agent (the topology root) from its node. */
			const openMain = (0, react.useCallback)(() => {
				if (rootId === void 0) return;
				try {
					sessions.open?.(rootId);
				} catch (error) {
					console.warn("[dsh-better-sidebar] open session failed:", error);
				}
			}, [sessions, rootId]);
			const refresh = (0, react.useCallback)((parentSessionId) => {
				sessions.refreshSubagents?.(parentSessionId);
			}, [sessions]);
			const totals = (0, react.useMemo)(() => rootId === void 0 ? {
				count: 0,
				runningCount: 0
			} : countSubagentDescendants(byId, rootId), [byId, rootId]);
			const summaryBackedLoading = rootId !== void 0 && (rootCatalog === void 0 || rootCatalog.state === "ready" && rootCatalog.entries.length === 0) && directChildren(byId, rootId).length > 0;
			const readyEmpty = rootCatalog?.state === "ready" && rootCatalog.entries.length === 0 && directChildren(byId, rootId ?? "").length === 0;
			const countLabel = totals.count === 0 ? void 0 : totals.runningCount > 0 ? t("subagentCountRunning", {
				count: totals.count,
				running: totals.runningCount
			}) : t("subagentCount", { count: totals.count });
			/** Arrow-key tree navigation over the visible rows (official catalog recipe). */
			const bodyRef = (0, react.useRef)(null);
			const focusAt = (0, react.useCallback)((index) => {
				const items = bodyRef.current?.querySelectorAll("[role=\"treeitem\"]:not([aria-disabled=\"true\"])") ?? [];
				if (items.length === 0) return;
				items[(index + items.length) % items.length]?.focus();
			}, []);
			const onTreeKeyDown = (0, react.useCallback)((event) => {
				const items = bodyRef.current?.querySelectorAll("[role=\"treeitem\"]:not([aria-disabled=\"true\"])") ?? [];
				const index = Array.prototype.indexOf.call(items, document.activeElement);
				if (event.key === "ArrowDown") {
					event.preventDefault();
					focusAt(index + 1);
				} else if (event.key === "ArrowUp") {
					event.preventDefault();
					focusAt(index < 0 ? items.length - 1 : index - 1);
				} else if (event.key === "Home") {
					event.preventDefault();
					focusAt(0);
				} else if (event.key === "End") {
					event.preventDefault();
					focusAt(items.length - 1);
				}
			}, [focusAt]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SubagentView_module_css_default.subagent,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.subagentHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SubagentView_module_css_default.subagentTitle,
							children: [t("subagent"), rootSummary?.displayTitle !== void 0 && rootSummary.displayTitle !== "" ? ` · ${rootSummary.displayTitle}` : ""]
						}),
						countLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SubagentView_module_css_default.subagentCount,
							children: countLabel
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SubagentView_module_css_default.subagentRefresh,
							"aria-label": t("refresh"),
							title: t("refresh"),
							disabled: rootId === void 0,
							onClick: () => {
								if (rootId !== void 0) refresh(rootId);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: bodyRef,
					className: SubagentView_module_css_default.subagentBody,
					onKeyDown: onTreeKeyDown,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "tree",
						"aria-label": t("subagent"),
						"aria-busy": summaryBackedLoading || void 0,
						children: [
							rootId !== void 0 && rootSummary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "treeitem",
								tabIndex: 0,
								"aria-level": 0,
								"aria-label": `${rootSummary.displayTitle !== "" ? rootSummary.displayTitle : t("subagentMainAgent")} ${t("subagentMainAgent")}`,
								"aria-current": rootId === sessionId ? "true" : void 0,
								className: clsx(SubagentView_module_css_default.subagentRow, rootId === sessionId && SubagentView_module_css_default.subagentRowActive),
								onClick: openMain,
								onKeyDown: (event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										event.stopPropagation();
										openMain();
									}
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: rootSummary.running === true ? "ongoing" : "done",
									className: SubagentView_module_css_default.subagentDot
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SubagentView_module_css_default.subagentContent,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentLabel,
										children: rootSummary.displayTitle !== "" ? rootSummary.displayTitle : t("subagentMainAgent")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentSecondary,
										children: `${t("subagentMainAgent")} · ${rootSummary.running === true ? t("subagentRunning") : t("subagentInactive")}`
									})]
								})]
							}),
							rootId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SubagentView_module_css_default.subagentChildren,
								role: "group",
								"aria-busy": summaryBackedLoading || void 0,
								children: [summaryBackedLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
									parentSessionId: rootId,
									byId,
									level: 1
								}), !summaryBackedLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogRows, {
									parentSessionId: rootId,
									catalog: rootCatalog,
									catalogs,
									byId,
									level: 1,
									currentSessionId: sessionId,
									active,
									ctx,
									openChild,
									refresh
								})]
							}),
							readyEmpty && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SubagentView_module_css_default.subagentEmpty,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("subagentEmpty") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SubagentView_module_css_default.subagentEmptyHint,
									children: t("subagentEmptyDesc")
								})]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobsSection, {
						byId,
						jobsBySession: list.jobsBySession,
						rootId,
						active
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/browser.ts
		/**
		* Decide whether a site can render inside the sidebar iframe. The signals
		* are exactly the ones the BROWSER enforces when it refuses an iframe load:
		* X-Frame-Options DENY/SAMEORIGIN, or a frame-ancestors directive that does
		* not allow `*` ('self' here means the SITE's own origin — never ours, so
		* it also blocks the sidebar). A site we could not reach yields 'unknown'
		* and the plain iframe stays.
		*/
		function embeddabilityOf(probe) {
			if (probe.reachable !== true) return "unknown";
			const xfo = probe.xFrameOptions?.trim().toUpperCase();
			if (xfo === "DENY" || xfo === "SAMEORIGIN") return "blocked";
			if (probe.frameAncestors !== void 0 && !probe.frameAncestors.some((source) => source === "*")) return "blocked";
			return "embeddable";
		}
		/** A loopback hostname (localhost, IPv6 ::1, 127.0.0.0/8, 0.0.0.0). */
		function isLoopbackHostname(hostname) {
			const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
			if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
			const parts = host.split(".");
			return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
		}
		/**
		* Normalize one address-bar input against the navigation policy.
		* @param input - raw user text.
		* @param selfOrigin - the GUI's own origin (window.location.origin). The GUI
		* itself may be browsed in the sidebar (the sandbox keeps it opaque), so it
		* is let through BEFORE the loopback check — its host is normally loopback.
		*/
		/** Schemes that must never reach the iframe, even without `//` (javascript:,
		*  data:, file:, ...). Host:port lookalikes (example.com:8080) are NOT here —
		*  they parse as hosts below. */
		const FORBIDDEN_SCHEMES = /* @__PURE__ */ new Set([
			"javascript",
			"data",
			"file",
			"about",
			"vbscript",
			"blob",
			"mailto",
			"tel",
			"ftp",
			"ftps",
			"ws",
			"wss",
			"sftp",
			"ssh",
			"chrome",
			"chrome-extension",
			"moz-extension",
			"edge",
			"opera",
			"resource",
			"view-source"
		]);
		function normalizeBrowserUrl(input, selfOrigin) {
			const trimmed = input.trim();
			if (trimmed === "") return { kind: "invalid" };
			const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
			let withScheme;
			if (schemeMatch === null) withScheme = `https://${trimmed}`;
			else {
				const scheme = schemeMatch[1].toLowerCase();
				if (scheme === "http" || scheme === "https") withScheme = trimmed;
				else if (FORBIDDEN_SCHEMES.has(scheme)) return {
					kind: "blocked",
					reason: "scheme"
				};
				else withScheme = `https://${trimmed}`;
			}
			let url;
			try {
				url = new URL(withScheme);
			} catch {
				return { kind: "invalid" };
			}
			if (url.protocol !== "http:" && url.protocol !== "https:") return {
				kind: "blocked",
				reason: "scheme"
			};
			try {
				if (url.origin === new URL(selfOrigin).origin) return {
					kind: "ok",
					url: url.href
				};
			} catch {}
			if (isLoopbackHostname(url.hostname)) return {
				kind: "blocked",
				reason: "loopback"
			};
			return {
				kind: "ok",
				url: url.href
			};
		}
		//#endregion
		//#region src/client/SandboxStatusBar.tsx
		init_clsx();
		init_locales();
		init_sidebar_module_css();
		function SandboxStatusBar(props) {
			const { sandboxed, local, dangerCopy, onUnlock, onRestore } = props;
			if (sandboxed) {
				const copy = t("sandboxStatusOn");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(sidebar_module_css_default.sandboxStatus, sidebar_module_css_default.sandboxStatusOn),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: sidebar_module_css_default.sandboxDot }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.sandboxStatusText,
							title: copy,
							children: copy
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.sandboxAction,
							onClick: onUnlock,
							children: t("sandboxUnlock")
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.sandboxStatus, sidebar_module_css_default.sandboxStatusOff),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: sidebar_module_css_default.sandboxDot }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.sandboxStatusText,
						title: dangerCopy,
						children: dangerCopy
					}),
					local && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.sandboxAction,
						onClick: onRestore,
						children: t("sandboxRestore")
					})
				]
			});
		}
		//#endregion
		//#region src/client/BrowserView.tsx
		/**
		* The built-in browser tab: an address bar plus a sandboxed iframe.
		*
		* Security model (see browser.ts + the sandbox tokens below): the iframe is
		* ALWAYS sandboxed without `allow-same-origin` (opaque origin — the visited
		* page can never sit on the GUI's origin, read its storage, or reach
		* /sidebar/api) and without `allow-top-navigation` (a page must not hijack
		* the GUI). The address bar only accepts http(s) and refuses loopback /
		* the GUI's own origin. The side card setting "关闭浏览器沙箱" drops the
		* sandbox attribute entirely for fully trusted sites — the visited page then
		* runs with the GUI's own origin and full session access, so a persistent
		* warning bar renders while it is off.
		*
		* The URL is persisted onto the tab (path/title via the patchTab reducer)
		* so a reload restores the visited page; the back/forward stack only tracks
		* address-bar navigations (in-frame link clicks are cross-origin and
		* invisible — a documented limitation).
		*/
		init_state();
		init_locales();
		init_sidebar_module_css();
		/**
		* The browser iframe sandbox tokens. NO allow-same-origin (opaque origin —
		* no GUI storage/API access), NO allow-top-navigation (a browsed page must
		* not hijack the GUI). allow-forms/allow-popups/allow-downloads/allow-modals
		* keep login flows working; allow-popups-to-escape-sandbox lets OAuth
		* popups open as normal tabs (they are cross-origin to the GUI either way).
		*/
		const BROWSER_IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-popups-to-escape-sandbox";
		function BrowserView(props) {
			const { store, tab } = props;
			const [url, setUrl] = (0, react.useState)(tab.path);
			const [input, setInput] = (0, react.useState)(tab.path ?? "");
			/** Blocked/invalid hint shown under the address bar (null = none). */
			const [message, setMessage] = (0, react.useState)(null);
			/** Address-bar navigation history (in-frame clicks are not tracked). */
			const [history, setHistory] = (0, react.useState)(tab.path !== void 0 ? [tab.path] : []);
			const [cursor, setCursor] = (0, react.useState)(tab.path !== void 0 ? 0 : -1);
			/** Bumped on reload to remount the iframe (also remounts on sandbox flip). */
			const [reloadKey, setReloadKey] = (0, react.useState)(0);
			/** TEMPORARY sandbox unlock for THIS surface only (never writes the global
			*  side card setting; lasts until the tab unmounts or the user restores). */
			const [localUnlock, setLocalUnlock] = (0, react.useState)(false);
			const noSandbox = store.getPrefs().browserNoSandbox === true || localUnlock;
			/** A site that refuses to be embedded (X-Frame-Options / frame-ancestors):
			*  the probe verdict shown instead of the blank iframe. */
			const [embedBlocked, setEmbedBlocked] = (0, react.useState)(null);
			/** The user asked to load the refused site anyway (keeps the plain iframe). */
			const [forceEmbed, setForceEmbed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (url === void 0) return;
				let cancelled = false;
				setEmbedBlocked(null);
				setForceEmbed(false);
				api.browserProbe(url).then((probe) => {
					if (!cancelled && embeddabilityOf(probe) === "blocked") setEmbedBlocked(url);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, [url]);
			const persist = (nextUrl) => {
				let host = nextUrl;
				try {
					host = new URL(nextUrl).hostname;
				} catch {}
				store.reduce((state) => patchTab(state, tab.id, {
					path: nextUrl,
					title: host
				}));
			};
			const navigateTo = (raw) => {
				const result = normalizeBrowserUrl(raw, window.location.origin);
				if (result.kind === "ok") {
					const next = result.url;
					setUrl(next);
					setInput(next);
					setMessage(null);
					setHistory((previous) => [...previous.slice(0, cursor + 1), next]);
					setCursor((previous) => previous + 1);
					setReloadKey((key) => key + 1);
					persist(next);
					return;
				}
				setMessage(result.kind === "invalid" ? t("browserInvalid") : result.reason === "scheme" ? t("browserBlockedScheme") : t("browserBlockedLoopback"));
			};
			const goBack = () => {
				if (cursor <= 0) return;
				const next = history[cursor - 1];
				setCursor(cursor - 1);
				setUrl(next);
				setInput(next);
				setReloadKey((key) => key + 1);
			};
			const goForward = () => {
				if (cursor >= history.length - 1) return;
				const next = history[cursor + 1];
				setCursor(cursor + 1);
				setUrl(next);
				setInput(next);
				setReloadKey((key) => key + 1);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.browser,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.browserBar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserBack"),
								title: t("browserBack"),
								disabled: cursor <= 0,
								onClick: goBack,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserForward"),
								title: t("browserForward"),
								disabled: cursor >= history.length - 1,
								onClick: goForward,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								onClick: () => {
									setReloadKey((key) => key + 1);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: sidebar_module_css_default.browserInput,
								value: input,
								placeholder: t("browserPlaceholder"),
								spellCheck: false,
								onChange: (event) => {
									setInput(event.target.value);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") navigateTo(input);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserGo"),
								title: t("browserGo"),
								onClick: () => {
									navigateTo(input);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserOpenExternal"),
								title: t("browserOpenExternal"),
								disabled: url === void 0,
								onClick: () => {
									if (url !== void 0) window.open(url, "_blank", "noopener");
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutline16, { size: 15 })
							})
						]
					}),
					message !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserMessage,
						children: message
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxStatusBar, {
						sandboxed: !noSandbox,
						local: localUnlock,
						dangerCopy: t("browserNoSandboxWarning"),
						onUnlock: () => {
							setLocalUnlock(true);
						},
						onRestore: () => {
							setLocalUnlock(false);
						}
					}),
					url === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserStart,
						children: t("browserStart")
					}) : embedBlocked !== null && !forceEmbed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowserEmbedBlocked, {
						url: embedBlocked,
						onOpenInBrowser: () => {
							window.open(embedBlocked, "_blank", "noopener");
						},
						onLoadAnyway: () => {
							setForceEmbed(true);
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						className: sidebar_module_css_default.browserFrame,
						src: url,
						sandbox: noSandbox ? void 0 : BROWSER_IFRAME_SANDBOX,
						referrerPolicy: "no-referrer",
						allow: "",
						title: url
					}, `${reloadKey}:${noSandbox ? "ns" : "sb"}`)
				]
			});
		}
		/**
		* The embed-refusal panel: shown when the probed site forbids being
		* displayed inside other pages (X-Frame-Options / frame-ancestors) — the
		* iframe would only show the browser's "refused to connect" blank. Explains
		* the reason and offers the real-browser open plus a load-anyway escape.
		* Exported so the copy and the actions are testable without a DOM.
		*/
		function BrowserEmbedBlocked(props) {
			const { url, onOpenInBrowser, onLoadAnyway } = props;
			let host = url;
			try {
				host = new URL(url).hostname;
			} catch {}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.browserBlocked,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 16 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserBlockedTitle,
						children: t("browserEmbedBlocked", { host })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserBlockedDesc,
						children: t("browserEmbedBlockedDesc")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.browserBlockedActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.browserBlockedButton,
							onClick: onOpenInBrowser,
							children: t("browserOpenExternal")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.browserBlockedButton,
							onClick: onLoadAnyway,
							children: t("browserEmbedAnyway")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/builtins/tabs.tsx
		/**
		* The 9 built-in tab descriptors: the plugin registers its own pages
		* (explorer / git / review / terminal / browser / subagent / editor / diff / git-log) through
		* the same {@link BetterSidebarService} external plugins use — eating its
		* own dogfood. The terminal descriptor owns its quota (`TERMINAL_LIMIT`)
		* and mints `terminal:<n>` ids through `createTab`; the browser mints
		* `browser:<n>` the same way (no quota).
		*/
		init_state();
		init_locales();
		init_prefs_shared();
		/**
		* Lazy wrapper over the terminal view: xterm (and its stylesheet) is fetched
		* only when a terminal tab is first opened (see chunk-loader.ts). The
		* wrapper keeps the descriptor contract `(props) => ReactNode` — Sidebar
		* calls it as a plain function.
		*
		* TerminalView's props are { scope, tabId, store } — `tabId` is NOT part of
		* TabComponentProps (it carries `tab: SidebarTab` instead), so the
		* descriptor maps it explicitly; a bare pass-through would leave tabId
		* undefined and TerminalView's isAgentTabId(tabId) would crash on
		* `undefined.startsWith` (regression-pinned in tests/lazy-chunk.spec.tsx).
		*/
		const LazyTerminal = lazyChunkComponent("terminal", (mod) => mod.TerminalView);
		/** Count UI-owned terminals (agent:` tabs excluded — they are the model's). */
		function uiTerminalCount(state) {
			return allLeaves(state.splits).concat(allLeaves(state.bottomSplits)).flatMap((leaf) => leaf.tabs).concat(state.centerTabs).filter((tab) => tab.type === "terminal" && !isAgentTabId(tab.id)).length;
		}
		/** The 7 built-in tab descriptors. */
		function builtinTabs(ctx) {
			return [
				{
					id: "editor",
					title: () => t("editor"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size }),
					order: -1,
					hidden: true,
					dedupeKey: (tab) => tab.path,
					component: ({ ctx, store, scope, tab }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorHost, {
						ctx,
						store,
						scope,
						path: tab.path ?? "",
						title: tab.title
					})
				},
				{
					id: "explorer",
					title: () => t("explorer"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size }),
					order: 10,
					single: true,
					component: ({ ctx, store, scope, expanded, onToggleDir, onReferenceFile }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplorerView, {
						sessionId: scope.sessionId,
						cwd: scope.cwd,
						expanded: expanded ?? [],
						onToggle: onToggleDir ?? (() => {}),
						onOpenFile: (path) => {
							openSidebarFile(ctx, store, scope.sessionId, path);
						},
						onOpenFileAbove: (path) => {
							openSidebarFileAbove(ctx, store, scope.sessionId, path);
						},
						onReferenceFile: onReferenceFile ?? (() => {})
					})
				},
				{
					id: "git",
					title: () => t("git"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size }),
					order: 20,
					single: true,
					component: ({ ctx, store, scope, onOpenDiff }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitView, {
						scope,
						store,
						onOpenFile: (path) => {
							openSidebarFile(ctx, store, scope.sessionId, path);
						},
						onOpenDiff: onOpenDiff ?? (() => {})
					})
				},
				{
					id: "review",
					title: () => t("review"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconReviewOutline16, { size }),
					order: 25,
					single: true,
					badge: (ctx, scope) => {
						const nodes = ctx.sessions.binding?.(scope.sessionId)?.session.getSnapshot().nodes ?? [];
						try {
							const count = pendingCount(scope.sessionId, latestSessionEdits(collectSessionEdits(nodes, scope.cwd)));
							return count === 0 ? null : count;
						} catch {
							return null;
						}
					},
					component: ({ ctx, store, scope }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReviewView, {
						ctx,
						store,
						scope
					})
				},
				{
					id: "git-log",
					title: () => t("history"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconHistoryOutline16, { size }),
					order: -1,
					hidden: true,
					dedupeKey: (tab) => tab.id,
					component: ({ ctx, store, scope, tab }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitLogView, {
						ctx,
						store,
						scope: {
							...scope,
							repo: typeof tab.meta === "string" ? tab.meta : void 0
						},
						repo: typeof tab.meta === "string" ? tab.meta : void 0
					})
				},
				{
					id: "subagent",
					title: () => t("subagent"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline16, { size }),
					order: 30,
					single: true,
					settings: { toggles: [{
						key: "autoOpenSubagent",
						title: () => t("settingsSubagentTitle"),
						desc: () => t("settingsSubagentDesc")
					}, {
						key: "autoOpenJobs",
						title: () => t("settingsJobsTitle"),
						desc: () => t("settingsJobsDesc")
					}] },
					component: ({ ctx, scope, visible, onSubagentJump }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentView, {
						sessionId: scope.sessionId,
						ctx,
						active: visible,
						onOpenChild: (address) => {
							onSubagentJump?.(address.childSessionId);
						}
					})
				},
				{
					id: "terminal",
					title: () => t("terminal"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTerminalOutline16, { size }),
					order: 40,
					available: (_ctx, _scope, state) => uiTerminalCount(state) < 3,
					settings: { toggles: [
						{
							key: "agentTerminalTools",
							title: () => t("settingsToolsTitle"),
							desc: () => t("settingsToolsDesc")
						},
						{
							key: "bottomPanelAutoTerminal",
							title: () => t("settingsBottomTerminalTitle"),
							desc: () => t("settingsBottomTerminalDesc")
						},
						{
							key: "terminalFontFamily",
							type: "text",
							title: () => t("settingsFontFamilyTitle"),
							desc: () => t("settingsFontFamilyDesc"),
							placeholder: t("settingsFontFamilyPlaceholder")
						},
						{
							key: "terminalFontSize",
							type: "number",
							title: () => t("settingsFontSizeTitle"),
							desc: () => t("settingsFontSizeDesc"),
							min: 9,
							max: 32,
							unit: "px"
						}
					] },
					createTab: (state) => {
						if (uiTerminalCount(state) >= 3) return null;
						return {
							tab: {
								id: `terminal:${state.nextTerminal}`,
								type: "terminal",
								title: `${t("terminal")} ${state.nextTerminal}`
							},
							patch: { nextTerminal: state.nextTerminal + 1 }
						};
					},
					component: ({ tab, scope, store }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTerminal, {
						scope,
						store,
						tabId: tab.id
					})
				},
				{
					id: "browser",
					title: () => t("browser"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconGlobeOutline16, { size }),
					order: 50,
					settings: { toggles: [
						{
							key: "browserNoSandbox",
							title: () => t("settingsBrowserSandboxTitle"),
							desc: () => t("settingsBrowserSandboxDesc")
						},
						{
							key: "browserInterceptLinks",
							title: () => t("settingsBrowserLinksTitle"),
							desc: () => t("settingsBrowserLinksDesc")
						},
						{
							key: "browserInterceptHttp",
							title: () => t("settingsBrowserHttpTitle"),
							desc: () => t("settingsBrowserHttpDesc")
						},
						{
							key: "browserInterceptHttps",
							title: () => t("settingsBrowserHttpsTitle"),
							desc: () => t("settingsBrowserHttpsDesc")
						}
					] },
					createTab: (state) => ({
						tab: {
							id: `browser:${state.nextBrowser}`,
							type: "browser",
							title: t("browser")
						},
						patch: { nextBrowser: state.nextBrowser + 1 }
					}),
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowserView, { ...props })
				},
				{
					id: "diff",
					title: () => t("git"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDiffOutline16, { size }),
					order: -1,
					hidden: true,
					dedupeKey: (tab) => tab.id,
					component: ({ ctx, scope, tab }) => tab.diff === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffTab, {
						ctx,
						sessionId: scope.sessionId,
						cwd: scope.cwd,
						diff: tab.diff
					})
				}
			];
		}
		//#endregion
		//#region src/client/PdfView.tsx
		/** Browser-native PDF preview with an always-available download fallback. */
		init_clsx();
		init_locales();
		init_sidebar_module_css();
		function PdfView(props) {
			const { scope, path, title } = props;
			const [load, setLoad] = (0, react.useState)({ status: "loading" });
			const [interactionBlocked, setInteractionBlocked] = (0, react.useState)(false);
			const frameRef = (0, react.useRef)(null);
			const shieldRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				let objectUrl;
				setLoad({ status: "loading" });
				(async () => {
					try {
						const response = await fetch(mediaUrl(scope, path), { signal: controller.signal });
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						const bytes = await response.arrayBuffer();
						if (controller.signal.aborted) return;
						objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
						setLoad({
							status: "ready",
							url: objectUrl
						});
					} catch (error) {
						if (controller.signal.aborted) return;
						setLoad({
							status: "error",
							message: error instanceof Error ? error.message : String(error)
						});
					}
				})();
				return () => {
					controller.abort();
					if (objectUrl !== void 0) URL.revokeObjectURL(objectUrl);
				};
			}, [
				scope.sessionId,
				scope.cwd,
				path
			]);
			(0, react.useEffect)(() => {
				const block = () => {
					setInteractionBlocked(true);
					if (frameRef.current !== null) frameRef.current.style.pointerEvents = "none";
					if (shieldRef.current !== null) shieldRef.current.style.pointerEvents = "auto";
				};
				const unblock = () => {
					setInteractionBlocked(false);
					if (frameRef.current !== null) frameRef.current.style.pointerEvents = "";
					if (shieldRef.current !== null) shieldRef.current.style.pointerEvents = "none";
				};
				const blockForResize = (event) => {
					const target = event.target;
					if (target instanceof Element && target.closest(`.${sidebar_module_css_default.panelResize}, .${sidebar_module_css_default.divider}`) !== null) block();
				};
				document.addEventListener("dragstart", block, true);
				document.addEventListener("dragend", unblock, true);
				document.addEventListener("drop", unblock, true);
				window.addEventListener("pointerdown", blockForResize, true);
				window.addEventListener("pointerup", unblock, true);
				window.addEventListener("pointercancel", unblock, true);
				window.addEventListener("blur", unblock);
				return () => {
					document.removeEventListener("dragstart", block, true);
					document.removeEventListener("dragend", unblock, true);
					document.removeEventListener("drop", unblock, true);
					window.removeEventListener("pointerdown", blockForResize, true);
					window.removeEventListener("pointerup", unblock, true);
					window.removeEventListener("pointercancel", unblock, true);
					window.removeEventListener("blur", unblock);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorPdf,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.editorPdfToolbar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: sidebar_module_css_default.editorDownloadLink,
						href: downloadUrl(scope, path),
						download: true,
						children: t("downloadToView")
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorPdfStage,
					children: [
						load.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.editorPlaceholder,
							children: t("loading")
						}),
						load.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.editorError,
							children: load.message
						}),
						load.status === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
							ref: frameRef,
							className: clsx(sidebar_module_css_default.editorPdfFrame, interactionBlocked && sidebar_module_css_default.editorPdfFrameBlocked),
							src: load.url,
							title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: shieldRef,
							className: clsx(sidebar_module_css_default.editorPdfDragShield, interactionBlocked && sidebar_module_css_default.editorPdfDragShieldActive),
							"aria-hidden": "true"
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/builtins/viewers.tsx
		/**
		* The 6 built-in file viewer descriptors: every preview surface is a
		* registered viewer (image / pdf / markdown / html / code /
		* binary-download), exactly like external plugins register theirs. Office
		* previews (.docx / .xlsx / .pptx) are NOT built in anymore — they moved to
		* the recommended office plugin (see plugins-viewers.ts), which registers
		* the same ids through this service.
		*
		* The `binary-download` viewer sniffs NUL bytes via `detect` for unknown
		* binaries and serves legacy doc/xls/ppt by extension; `code` is the
		* catch-all (`exts: []`, lowest priority) that claims any file no other
		* viewer did.
		*
		* The heavy viewers (the CodeMirror-backed markdown/html/code) render
		* through {@link lazyChunkComponent} wrappers — their libraries are fetched
		* only when such a file is first opened (see chunk-loader.ts). The
		* descriptor metadata (id/exts/priority/detect) is identical either way,
		* so matching semantics and external-plugin overrides are unaffected; the
		* `component` wrapper keeps the descriptor contract `(props) => ReactNode`.
		*
		* Every viewer carries the declarative settings-surface fields — `title`
		* and `icon` — so the Side card settings page can render the enable/disable
		* inventory without hardcoding (eating our own dogfood).
		*/
		init_locales();
		init_sidebar_module_css();
		/**
		* Lazy wrapper over the chunk-resident viewer component. The `pick`
		* function is module-level (stable identity — the wrapper effect depends
		* on it); the cast bridges the chunk exports record to the descriptor prop
		* shape (the view reads only its own subset of FileViewerProps).
		*/
		const LazyTextEditor = lazyChunkComponent("editor", (mod) => mod.TextEditor);
		/** The 6 built-in file viewer descriptors. */
		function builtinViewers() {
			return [
				{
					id: "image",
					title: () => t("viewerImage"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconImageOutline16, { size }),
					exts: [
						"png",
						"jpg",
						"jpeg",
						"gif",
						"webp",
						"svg",
						"bmp",
						"ico",
						"avif"
					],
					fetchStrategy: "mediaUrl",
					component: ({ mediaUrl: url, title }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.editorImageWrap,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: sidebar_module_css_default.editorImage,
							src: url,
							alt: title
						})
					})
				},
				{
					id: "pdf",
					title: () => t("viewerPdf"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPdfOutline16, { size }),
					exts: ["pdf"],
					fetchStrategy: "mediaUrl",
					component: ({ scope, path, title }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PdfView, {
						scope,
						path,
						title
					})
				},
				{
					id: "markdown",
					title: () => t("viewerMarkdown"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMarkdownOutline16, { size }),
					exts: ["md", "markdown"],
					fetchStrategy: "fsRead",
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "html",
					title: () => t("viewerHtml"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconHtmlOutline16, { size }),
					exts: ["html", "htm"],
					fetchStrategy: "fsRead",
					settings: { toggles: [{
						key: "htmlViewerNoSandbox",
						title: () => t("settingsHtmlSandboxTitle"),
						desc: () => t("settingsHtmlSandboxDesc")
					}, {
						key: "htmlViewerDefaultUnsafe",
						title: () => t("settingsHtmlDefaultUnsafeTitle"),
						desc: () => t("settingsHtmlDefaultUnsafeDesc")
					}] },
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "code",
					title: () => t("viewerCode"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size }),
					exts: [],
					priority: -100,
					fetchStrategy: "fsRead",
					settings: { toggles: [{
						key: "editorMinimap",
						title: () => t("settingsEditorMinimapTitle"),
						desc: () => t("settingsEditorMinimapDesc")
					}] },
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "binary-download",
					title: () => t("viewerBinary"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size }),
					exts: [
						"doc",
						"xls",
						"ppt"
					],
					priority: -50,
					fetchStrategy: "binary-download",
					detect: (_path, head) => head.includes(0),
					component: ({ scope, path }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BinaryDownload, {
						scope,
						path
					})
				}
			];
		}
		//#endregion
		//#region src/client/builtins/index.ts
		/**
		* Register all built-in tabs and viewers with the service. Returns a
		* disposer that unregisters everything (cordis auto-invokes it on fiber
		* disposal). The `ctx` is threaded into tab descriptors that need it
		* (EditorHost reads `ctx.betterSidebar` for file-viewer matching).
		*/
		function registerBuiltins(ctx, service) {
			const disposers = [];
			for (const tab of builtinTabs(ctx)) disposers.push(service.registerTab(tab));
			for (const viewer of builtinViewers()) disposers.push(service.registerFileViewer(viewer));
			return () => {
				for (const d of disposers) try {
					d();
				} catch {}
			};
		}
		//#endregion
		//#region src/client/split-pane.tsx
		/**
		* The split-pane workbench: renders the recursive split tree. A split lays
		* children out row- or column-wise with draggable dividers (fractional
		* sizes); a leaf renders its tab strip plus the active tab's content.
		*
		* Splitting is VSCode-style DRAG-TO-EDGE, not buttons: while dragging a tab
		* over a pane, a drop overlay shows five zones — four edges (left/right/up/
		* down) that split the pane with the tab in a fresh leaf, and the center
		* that merges the tab into the pane. The tree and all operations live in
		* state.ts; this file is pure presentation over them.
		*/
		init_clsx();
		init_state();
		init_TabBar();
		init_sidebar_module_css();
		/** One divider: pointer-capture drag translating px deltas into fractions.
		* Deltas are incremental — each move reports the displacement since the
		* previous move — because the store adds every reported delta to the pane
		* sizes; a cumulative (since-pointer-down) delta would be re-added on each
		* move and the divider would run away from the cursor. */
		function Divider(props) {
			const { dir, onResize } = props;
			const last = (0, react.useRef)({
				x: 0,
				y: 0,
				size: 0
			});
			const [dragging, setDragging] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.divider, dir === "row" ? sidebar_module_css_default.dividerRow : sidebar_module_css_default.dividerCol, dragging && sidebar_module_css_default.dividerActive),
				onPointerDown: (event) => {
					event.preventDefault();
					event.currentTarget.setPointerCapture(event.pointerId);
					const box = event.currentTarget.parentElement?.getBoundingClientRect();
					last.current = {
						x: event.clientX,
						y: event.clientY,
						size: box === void 0 ? 1 : dir === "row" ? box.width : box.height
					};
					setDragging(true);
				},
				onPointerMove: (event) => {
					if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
					const delta = dir === "row" ? event.clientX - last.current.x : event.clientY - last.current.y;
					onResize(delta / Math.max(1, last.current.size));
					last.current.x = event.clientX;
					last.current.y = event.clientY;
				},
				onPointerUp: (event) => {
					if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
					event.currentTarget.releasePointerCapture(event.pointerId);
					setDragging(false);
				}
			});
		}
		/** Map a pointer position inside a pane to the VSCode drop zone (25% edges). */
		function zoneAt(event, pane) {
			const rect = pane.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return "center";
			const x = (event.clientX - rect.left) / rect.width;
			const y = (event.clientY - rect.top) / rect.height;
			if (x < .25) return "left";
			if (x > .75) return "right";
			if (y < .25) return "up";
			if (y > .75) return "down";
			return "center";
		}
		/**
		* The VS Code-style activity bar: a vertical rail of one icon per openable
		* tool view (non-hidden, enabled tab types). Clicking an icon opens/focuses
		* that view (same dedupe semantics as the old + menu); the active view's icon
		* collapses the panel (VS Code) instead. A disabled view's icon is inert,
		* EXCEPT the active one still collapses the panel on click (the close
		* affordance stays live even when the view itself is unavailable).
		*/
		function ActivityBar(props) {
			const { options, activeType, onSelect, getBadge, side = "left" } = props;
			if (options.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.activityBar, side === "right" && sidebar_module_css_default.activityBarRight),
				"data-sidebar-activity-bar": true,
				children: options.map((option) => {
					const active = activeType === option.id;
					const disabled = option.disabled === true;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "button",
						tabIndex: 0,
						"aria-label": option.label,
						title: option.label,
						"aria-disabled": !active && disabled || void 0,
						className: clsx(sidebar_module_css_default.activityItem, active && sidebar_module_css_default.activityActive),
						onClick: () => {
							if (disabled && !active) return;
							onSelect(option.id);
						},
						onKeyDown: (event) => {
							if (event.target !== event.currentTarget) return;
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								if (disabled && !active) return;
								onSelect(option.id);
							}
						},
						children: [option.icon ?? null, getBadge?.(option.id) ?? null]
					}, option.id);
				})
			});
		}
		/**
		* An empty pane's welcome cards: the openable types as cards, clicked to
		* open (instead of a bare "this pane is empty" message).
		*/
		function PaneEmptyCards(props) {
			const { newTabOptions, onNewTab } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.paneEmptyCards,
				children: newTabOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: sidebar_module_css_default.paneCard,
					disabled: option.disabled === true,
					title: option.label,
					onClick: () => {
						onNewTab(option.id);
					},
					children: [option.icon ?? null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label })]
				}, option.id))
			});
		}
		/** A leaf: tab strip + active content + VSCode-style drop target for tabs. */
		function LeafView(props) {
			const { leaf, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter } = props;
			const [dropZone, setDropZone] = (0, react.useState)(null);
			const activeTab = leaf.tabs.find((tab) => tab.id === leaf.active) ?? leaf.tabs[leaf.tabs.length - 1];
			(0, react.useEffect)(() => {
				const clear = () => {
					setDropZone(null);
				};
				window.addEventListener("dragend", clear, true);
				window.addEventListener("drop", clear, true);
				window.addEventListener("blur", clear);
				return () => {
					window.removeEventListener("dragend", clear, true);
					window.removeEventListener("drop", clear, true);
					window.removeEventListener("blur", clear);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.pane, dropZone !== null && sidebar_module_css_default.paneDrop),
				onPointerDown: () => {
					actions.focusPane(leaf.id);
				},
				onDragOver: (event) => {
					event.preventDefault();
					const zone = zoneAt(event, event.currentTarget);
					setDropZone(zone);
				},
				onDragLeave: (event) => {
					if (!event.currentTarget.contains(event.relatedTarget)) setDropZone(null);
				},
				onDrop: (event) => {
					event.preventDefault();
					const zone = dropZone ?? zoneAt(event, event.currentTarget);
					setDropZone(null);
					const payload = parseDrag(event.dataTransfer.getData("application/x-dsh-tab"));
					if (payload !== null) actions.moveTabToEdge(payload, leaf.id, zone);
				},
				children: [
					dropZone !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: clsx(sidebar_module_css_default.dropOverlay, sidebar_module_css_default[`drop${dropZone[0].toUpperCase()}${dropZone.slice(1)}`]) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabBar, {
						paneId: leaf.id,
						tabs: leaf.tabs,
						active: leaf.active,
						onActivate: (tabId) => {
							actions.activateTab(leaf.id, tabId);
						},
						onClose: (tabId) => {
							actions.closeTab(leaf.id, tabId);
						},
						getTabIcon,
						getTabBadge,
						getTabTitleClass,
						stripTabFilter,
						onDropTab: (payload, before) => {
							if (before === null) actions.moveTabToEdge(payload, leaf.id, "center");
							else actions.moveTabBefore(payload, leaf.id, before);
						},
						onDockToCenter: (tabId) => {
							actions.dockTabToCenter(leaf.id, tabId);
						}
					}),
					leaf.tabs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.paneContent,
						children: leaf.tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(sidebar_module_css_default.paneTab, tab.id !== activeTab?.id && sidebar_module_css_default.paneTabHidden),
							children: renderTab(tab, tab.id === activeTab?.id, leaf.id)
						}, tab.id))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneEmptyCards, {
						newTabOptions,
						onNewTab
					})
				]
			});
		}
		/** Recursive node renderer. */
		function NodeView(props) {
			const { node, state, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter } = props;
			if (node.kind === "leaf") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeafView, {
				leaf: node,
				newTabOptions,
				actions,
				onNewTab,
				renderTab,
				getTabIcon,
				getTabBadge,
				getTabTitleClass,
				stripTabFilter
			});
			const isRow = node.dir === "row";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.split, isRow ? sidebar_module_css_default.splitRow : sidebar_module_css_default.splitCol),
				children: node.children.map((child, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Divider, {
					dir: node.dir,
					onResize: (deltaFrac) => {
						actions.resizeSplit(node.id, index - 1, deltaFrac);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.splitChild,
					style: {
						flexGrow: node.sizes[index],
						flexBasis: 0,
						minWidth: 0,
						minHeight: 0
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeView, {
						node: child,
						state,
						newTabOptions,
						actions,
						onNewTab,
						renderTab,
						getTabIcon,
						getTabBadge,
						getTabTitleClass,
						stripTabFilter
					})
				})] }, child.id))
			});
		}
		/** The workbench: the activity bar plus the split tree filling the sidebar
		*  body. `tree` selects which tree renders (the right panel's by default;
		*  the bottom panel passes `state.bottomSplits` — the actions route by pane
		*  id, so one action set serves both). `stripTabFilter` limits which tabs
		*  render in the strip (file-preview types only); `getActivityBadge` feeds
		*  per-type badges onto the activity icons. */
		function Workbench(props) {
			const { state, tree, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter, getActivityBadge, showActivityBar = true, activityBarSide = "left" } = props;
			const root = tree ?? state.splits;
			const focused = (0, react.useMemo)(() => {
				const paneId = state.activePane;
				const pane = (paneId === null ? void 0 : allLeaves(root).find((candidate) => candidate.id === paneId)) ?? firstLeaf(root);
				return {
					pane,
					tab: pane.tabs.find((candidate) => candidate.id === pane.active) ?? pane.tabs[pane.tabs.length - 1]
				};
			}, [root, state.activePane]);
			const activeType = focused.tab?.type;
			const handleSelect = (typeId) => {
				const panelOpen = props.panelOpen !== false;
				const multi = newTabOptions.some((option) => option.id === typeId && option.multi === true);
				if (panelOpen && activeType === typeId && !multi) {
					props.onTogglePanel?.();
					return;
				}
				if (!panelOpen) props.onTogglePanel?.();
				actions.focusPane(focused.pane.id);
				onNewTab(typeId);
			};
			const bar = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityBar, {
				options: newTabOptions,
				activeType,
				onSelect: handleSelect,
				getBadge: getActivityBadge,
				side: activityBarSide
			});
			const node = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeView, {
				node: root,
				state,
				newTabOptions,
				actions,
				onNewTab,
				renderTab,
				getTabIcon,
				getTabBadge,
				getTabTitleClass,
				stripTabFilter
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.workbench,
				children: [
					showActivityBar && activityBarSide === "left" ? bar : null,
					node,
					showActivityBar && activityBarSide === "right" ? bar : null
				]
			});
		}
		//#endregion
		//#region src/client/OrphanedTab.tsx
		init_locales();
		init_sidebar_module_css();
		function OrphanedTab(props) {
			const { tab } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editor,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.editorHeader,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.editorTitle,
						title: tab.type,
						children: tab.title
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorPlaceholder,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("pluginNotLoaded") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						className: sidebar_module_css_default.orphanedType,
						children: tab.type
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/RenderBoundary.tsx
		/**
		* The generic render error boundary for the sidebar tree: a render error in
		* the wrapped subtree shows a dismissible error strip (retry re-renders the
		* children) instead of blanking the shell. Used at two scopes:
		*
		* - ROOT (index.tsx, `css.boundaryError`): last-resort containment for
		*   errors in the sidebar shell itself (Workbench, drag layout, …) — a full
		*   swap keeps the page alive.
		* - PER-TAB (Sidebar.tsx TabContent, `css.tabBoundaryError`): a crashing
		*   viewer/editor shows a strip inside ITS OWN pane; the toggle cluster, the
		*   other tabs, and the panel itself stay alive (issue #31 — a tab crash
		*   must never take down the whole sidebar).
		*
		* The className prop selects the strip's geometry: the root's full-height
		* fixed rail vs. the tab's pane-filling block.
		*/
		init_locales();
		init_sidebar_module_css();
		var RenderBoundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error: error instanceof Error ? error.message : String(error) };
			}
			componentDidCatch(error, info) {
				console.error("[dsh-better-sidebar] render error:", error, info.componentStack);
			}
			render() {
				if (this.state.error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: this.props.className,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["dsh-better-sidebar: ", this.state.error] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.terminalRetry,
						onClick: () => {
							this.setState({ error: null });
						},
						children: t("terminalRetry")
					})]
				});
				return this.props.children;
			}
		};
		//#endregion
		//#region src/client/tab-content.tsx
		/**
		* Shared tab body: the workbench panes and the conversation-header dock
		* both render through this so a crash stays inside one tab.
		*/
		init_sidebar_module_css();
		function TabContent(props) {
			const { tab, sessionId, cwd, expanded, onToggleDir, onReferenceFile, ctx, store, visible, onSubagentJump, onOpenDiff } = props;
			const scope = {
				sessionId,
				cwd
			};
			const descriptor = ctx.betterSidebar?.getTab(tab.type);
			if (descriptor === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OrphanedTab, {
				ctx,
				store,
				scope,
				tab,
				visible
			});
			return (0, react.createElement)(RenderBoundary, { className: sidebar_module_css_default.tabBoundaryError }, (0, react.createElement)(descriptor.component, {
				ctx,
				store,
				scope,
				tab,
				visible,
				expanded,
				onToggleDir,
				onReferenceFile,
				onOpenDiff,
				onSubagentJump
			}));
		}
		//#endregion
		//#region src/client/theme.ts
		/**
		* Live theme access for surfaces that cannot consume the token colors
		* directly — xterm's palette and CodeMirror's theme extensions need concrete
		* values, but the app's scheme flips at runtime (ui-layout's ThemePresenter
		* projects prefers-color-scheme and the user's choice onto
		* body[data-ds-dark-theme] and html { color-scheme }). This module reads the
		* resolved scheme and token values, and notifies subscribers on flips, so
		* the terminal and the editor re-theme in place instead of freezing in the
		* scheme they happened to be created under.
		*/
		/** Whether the app shell resolved to the dark scheme.
		*
		* The presenter sets `html { color-scheme }` together with the body palette
		* attribute, so a set color-scheme means the decision is authoritative (an
		* absent attribute is then LIGHT even when the OS prefers dark — the user
		* chose light). Before the presenter has run, fall back to the OS media
		* query as the best guess.
		*/
		function isDarkScheme() {
			if (typeof document === "undefined") return true;
			if (document.documentElement.style.colorScheme !== "") return document.body.hasAttribute("data-ds-dark-theme");
			return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
		}
		/** One token's computed value on <body> ('' while the theme has not applied). */
		function tokenValue(name) {
			if (typeof document === "undefined") return "";
			return getComputedStyle(document.body).getPropertyValue(name).trim();
		}
		/** Minimal alpha for a token color to count as effectively opaque. Skin
		*  systems turn `--dsw-alias-bg-base` translucent for glass panels (the
		*  dsh-web-ui skins use rgba 0.16–0.7; `transparent` is 0); below this
		*  floor a text surface (terminal, editor) would render over the skin's
		*  backdrop art, so callers fall back to an opaque color. Values at or
		*  above the floor (e.g. a skin's scoped 0.96 porcelain) pass through —
		*  the skin still controls the surface. */
		const OPAQUE_ALPHA_MIN = .9;
		/** The alpha channel of a computed CSS color, or null when the format is
		*  not parseable (named colors, `color()`… — treated as opaque). Handles
		*  the shapes getComputedStyle actually returns: the rgb()/rgba() and
		*  hsl()/hsla() function forms (comma or space syntax, with or without the
		*  `/ alpha` slot) and the #rgb/#rgba/#rrggbb/#rrggbbaa hex family. */
		function colorAlpha(color) {
			const s = color.trim();
			const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
			if (hex !== null) {
				const digits = hex[1];
				if (digits.length === 3 || digits.length === 4) {
					const a = digits.length === 4 ? digits[3] : "f";
					return parseInt(a + a, 16) / 255;
				}
				const alphaHex = digits.length === 8 ? digits.slice(6) : "ff";
				return parseInt(alphaHex, 16) / 255;
			}
			const fn = /^(rgba?|hsla?)\(([^)]+)\)$/i.exec(s);
			if (fn !== null) {
				const alphaPart = fn[2].split(/[,\s/]+/).filter(Boolean)[3];
				if (alphaPart === void 0) return 1;
				const alpha = Number.parseFloat(alphaPart);
				return Number.isFinite(alpha) ? alpha : 1;
			}
			return null;
		}
		/**
		* A token value that actually PAINTS something — the guard for text
		* surfaces (issue #90). Skin systems routinely set global tokens to
		* `transparent` (glass skins) or translucent glass values (`rgba(…,0.16–0.7)`,
		* e.g. the dsh-web-ui skins) — both are truthy strings, so callers using
		* `|| fallback` never fire and the terminal/editor goes see-through over
		* the skin's backdrop. This returns '' for visually inert values (unset
		* keywords, transparent, and any color below the opacity floor) so the
		* caller's fallback chain engages; effectively opaque values pass through.
		*/
		function effectiveTokenValue(name) {
			const raw = tokenValue(name);
			switch (raw) {
				case "":
				case "transparent":
				case "initial":
				case "inherit":
				case "unset": return "";
				default: {
					const alpha = colorAlpha(raw);
					if (alpha !== null && alpha < OPAQUE_ALPHA_MIN) return "";
					return raw;
				}
			}
		}
		//#endregion
		//#region src/client/CenterPreview.tsx
		/**
		* In-conversation preview for tabs docked next to 对话 / 轨迹.
		*
		* The host conversation.view seat has no definite height (flex 1 0 auto /
		* min-height auto), so explorer/editor children collapse. This overlay
		* sits on the conversation column and renders the tab body ourselves.
		*/
		init_clsx();
		init_state();
		init_dom_sync();
		init_locales();
		init_sidebar_module_css();
		function useHostHeaderTabSync(ctx, store, onTabMenu) {
			(0, react.useEffect)(() => {
				let header;
				const tabOf = (button) => {
					const tabs = store.getSnapshot().state?.centerTabs ?? [];
					const id = button.getAttribute("data-dsh-center-tab");
					if (id !== null) return tabs.find((tab) => tab.id === id);
					const label = button.querySelector("[data-dsh-center-label]")?.textContent?.trim() ?? button.textContent?.trim() ?? "";
					return tabs.find((tab) => tab.title === label);
				};
				const applyFrom = (button) => {
					const match = tabOf(button);
					store.reduce((s) => {
						const next = match === void 0 ? null : match.id;
						return s.centerActive === next ? s : {
							...s,
							centerActive: next
						};
					});
				};
				const applyFromHostSelection = () => {
					if (header === void 0) return;
					const selected = header.querySelector("[role=\"tab\"][aria-selected=\"true\"], [role=\"tab\"].tabActive");
					if (!(selected instanceof HTMLElement)) return;
					applyFrom(selected);
				};
				const paintHostPins = (tablist) => {
					tablist.querySelector(":scope > [data-dsh-center-pin-plate]")?.remove();
					const pins = [...tablist.querySelectorAll(":scope > [role=\"tab\"]:not([data-dsh-center-tab])")].filter((node) => node instanceof HTMLElement);
					for (const node of tablist.querySelectorAll("[data-dsh-center-pin]")) if (node instanceof HTMLElement && !pins.includes(node)) {
						node.removeAttribute("data-dsh-center-pin");
						node.style.removeProperty("left");
					}
					if (pins.length === 0 || document.body.hasAttribute("data-dsh-center-tabs-wrap")) {
						for (const node of pins) {
							node.removeAttribute("data-dsh-center-pin");
							node.style.removeProperty("left");
						}
						return;
					}
					const fill = effectiveTokenValue("--dsw-alias-bg-layer-1") || effectiveTokenValue("--dsw-alias-bg-base") || (isDarkScheme() ? "#111114" : "#ffffff");
					if (tablist.style.getPropertyValue("--dsh-pin-fill") !== fill) tablist.style.setProperty("--dsh-pin-fill", fill);
					let left = 0;
					for (const node of pins) {
						if (!node.hasAttribute("data-dsh-center-pin")) node.setAttribute("data-dsh-center-pin", "");
						const nextLeft = `${left}px`;
						if (node.style.left !== nextLeft) node.style.left = nextLeft;
						left += node.getBoundingClientRect().width;
					}
				};
				const decorate = () => {
					if (header === void 0) return;
					const tablist = header.querySelector("[role=\"tablist\"]");
					if (!(tablist instanceof HTMLElement)) return;
					const tabs = store.getSnapshot().state?.centerTabs ?? [];
					const byTitle = new Map(tabs.map((tab) => [tab.title, tab]));
					for (const node of tablist.querySelectorAll("[role=\"tab\"]")) {
						if (!(node instanceof HTMLElement)) continue;
						const labelled = node.querySelector("[data-dsh-center-label]");
						const raw = labelled?.textContent?.trim() ?? node.childNodes[0]?.textContent?.trim() ?? node.textContent?.trim() ?? "";
						const markedId = node.getAttribute("data-dsh-center-tab");
						const tab = (markedId === null ? void 0 : tabs.find((item) => item.id === markedId)) ?? byTitle.get(raw);
						if (tab === void 0) {
							if (markedId === null) continue;
							node.removeAttribute("data-dsh-center-tab");
							node.querySelector("[data-dsh-center-close]")?.remove();
							continue;
						}
						if (markedId !== tab.id) node.setAttribute("data-dsh-center-tab", tab.id);
						if (labelled === null) {
							const label = document.createElement("span");
							label.setAttribute("data-dsh-center-label", "");
							while (node.firstChild !== null && !(node.firstChild instanceof HTMLElement && node.firstChild.hasAttribute("data-dsh-center-close"))) label.appendChild(node.firstChild);
							node.insertBefore(label, node.firstChild);
						}
						const painted = node.querySelector("[data-dsh-center-label]");
						if (painted instanceof HTMLElement) {
							const kindClass = classOfKind(latestGitKinds().get(workspacePathOfTab(tab) ?? ""));
							for (const name of [
								sidebar_module_css_default.gitAdded,
								sidebar_module_css_default.gitUntracked,
								sidebar_module_css_default.gitModified,
								sidebar_module_css_default.gitDeleted,
								sidebar_module_css_default.gitConflict
							]) if (name !== void 0 && name !== kindClass && painted.classList.contains(name)) painted.classList.remove(name);
							if (kindClass !== void 0 && !painted.classList.contains(kindClass)) painted.classList.add(kindClass);
						}
						if (node.querySelector("[data-dsh-center-close]") !== null) continue;
						const close = document.createElement("button");
						close.type = "button";
						close.setAttribute("data-dsh-center-close", "");
						close.className = sidebar_module_css_default.centerTabClose ?? "";
						close.setAttribute("aria-label", t("close"));
						close.textContent = "×";
						close.addEventListener("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							const tabId = close.closest("[data-dsh-center-tab]")?.getAttribute("data-dsh-center-tab");
							if (tabId === null || tabId === void 0) return;
							const sessionId = store.getSnapshot().sessionId;
							ctx.betterSidebar?.closeTab(tabId, sessionId === void 0 ? void 0 : { sessionId });
							const chat = header?.querySelector("[role=\"tab\"]:not([data-dsh-center-tab])");
							if (chat instanceof HTMLElement) chat.click();
						});
						node.appendChild(close);
					}
					if (!tablist.hasAttribute("data-dsh-center-wheel")) {
						tablist.setAttribute("data-dsh-center-wheel", "");
						tablist.addEventListener("wheel", (event) => {
							if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
							if (tablist.scrollWidth <= tablist.clientWidth) return;
							event.preventDefault();
							const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? tablist.clientWidth : 1;
							tablist.scrollLeft += (event.deltaX + event.deltaY) * unit;
						}, { passive: false });
					}
					paintHostPins(tablist);
					applyFromHostSelection();
				};
				const workspacePathOf = (tab) => {
					if (tab.type === "editor" && tab.path !== void 0 && tab.path !== "") return tab.path;
					if (tab.type === "diff") {
						if (tab.diff?.kind === "worktree") return tab.diff.path;
						if (tab.diff?.kind === "commit" && tab.diff.path !== void 0 && tab.diff.path !== "") return tab.diff.path;
					}
					return tab.path;
				};
				const promoteToWorkspaceEditor = (tab) => {
					const path = workspacePathOf(tab);
					if (path === void 0) return;
					const sessionId = store.getSnapshot().sessionId;
					if (sessionId === void 0) return;
					const editor = editorTabForPath(ctx, sessionId, path);
					store.reduce((s) => promoteCenterTabToEditor(s, tab.id, editor));
					const host = header?.querySelector(`[data-dsh-center-tab="${CSS.escape(tab.id)}"]`);
					const label = host?.querySelector("[data-dsh-center-label]");
					if (label !== null && label !== void 0) label.textContent = editor.title;
					host?.setAttribute("data-dsh-center-tab", editor.id);
				};
				const onClick = (event) => {
					if (header === void 0) return;
					if (event.target instanceof Element && event.target.closest("[data-dsh-center-close]") !== null) return;
					const button = (event.target instanceof Element ? event.target : null)?.closest("[role=\"tab\"]");
					if (!(button instanceof HTMLElement) || !header.contains(button)) return;
					applyFrom(button);
				};
				const onContextMenu = (event) => {
					if (header === void 0) return;
					const mouse = event;
					const button = (event.target instanceof Element ? event.target : null)?.closest("[role=\"tab\"]");
					if (!(button instanceof HTMLElement) || !header.contains(button)) return;
					const tab = tabOf(button);
					if (tab === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					store.reduce((s) => s.centerActive === tab.id ? s : {
						...s,
						centerActive: tab.id
					});
					onTabMenu({
						tabId: tab.id,
						x: mouse.clientX,
						y: mouse.clientY
					});
				};
				const onDblClick = (event) => {
					if (header === void 0) return;
					if (event.target instanceof Element && event.target.closest("[data-dsh-center-close]") !== null) return;
					const button = (event.target instanceof Element ? event.target : null)?.closest("[role=\"tab\"]");
					if (!(button instanceof HTMLElement) || !header.contains(button)) return;
					const tab = tabOf(button);
					if (tab === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					promoteToWorkspaceEditor(tab);
				};
				const remount = () => {
					const found = document.querySelector("[data-slot=\"conversation.session.header\"] header");
					if (!(found instanceof HTMLElement)) return;
					if (header !== found) {
						header?.removeEventListener("click", onClick);
						header?.removeEventListener("dblclick", onDblClick);
						header?.removeEventListener("contextmenu", onContextMenu);
						header = found;
						header.addEventListener("click", onClick);
						header.addEventListener("dblclick", onDblClick);
						header.addEventListener("contextmenu", onContextMenu);
					}
					decorate();
				};
				const guarded = scheduleGuardedFrame(remount);
				remount();
				const off = store.subscribe(guarded.schedule);
				const onResize = () => {
					guarded.schedule();
				};
				window.addEventListener("resize", onResize);
				const root = document.getElementById("root");
				const watcher = root === null ? void 0 : observeHostHeader(root, guarded.schedule);
				return () => {
					off();
					watcher?.disconnect();
					guarded.disconnect();
					window.removeEventListener("resize", onResize);
					header?.removeEventListener("click", onClick);
					header?.removeEventListener("dblclick", onDblClick);
					header?.removeEventListener("contextmenu", onContextMenu);
				};
			}, [
				ctx,
				store,
				onTabMenu
			]);
		}
		/**
		* True while the host's conversation-header tab strip is mounted (it hosts the
		* docked-file tabs as `conversation.view` slots next to 对话 / 轨迹). In a
		* FRESH conversation the host renders no header strip, so there is nowhere for
		* a docked-file tab to live — the overlay must paint its own strip.
		*/
		function useHostHeaderTablistPresent() {
			const [present, setPresent] = (0, react.useState)(() => {
				return document.querySelector("[data-slot=\"conversation.session.header\"] header [role=\"tablist\"]") instanceof HTMLElement;
			});
			(0, react.useEffect)(() => {
				const check = () => {
					const list = document.querySelector("[data-slot=\"conversation.session.header\"] header [role=\"tablist\"]");
					setPresent((prev) => {
						const next = list instanceof HTMLElement;
						return prev === next ? prev : next;
					});
				};
				const root = document.getElementById("root");
				const watcher = root === null ? void 0 : observeHostHeader(root, check);
				check();
				return () => {
					watcher?.disconnect();
				};
			}, []);
			return present;
		}
		function CenterTabContextMenu(props) {
			const { ctx, store, sessionId, menu, onClose } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: menu !== null,
				onClose,
				items: [
					{
						id: "close",
						label: t("close")
					},
					{
						id: "closeOthers",
						label: t("closeOthers")
					},
					{
						id: "closeAll",
						label: t("closeAll")
					}
				],
				onSelect: (id) => {
					const target = menu;
					onClose();
					if (target === null) return;
					if (id === "close") {
						ctx.betterSidebar?.closeTab(target.tabId, sessionId === void 0 ? void 0 : { sessionId });
						return;
					}
					if (id === "closeOthers") {
						store.reduce((s) => closeOtherCenterTabs(s, target.tabId));
						return;
					}
					if (id === "closeAll") store.reduce((s) => closeAllCenterTabs(s));
				},
				portal: true,
				align: "start",
				getAnchorRect: () => menu === null ? null : new DOMRect(menu.x, menu.y, 0, 0),
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
			});
		}
		function CenterPreview(props) {
			const { ctx, store, state, sessionId, cwd, left, right, top, bottom, onReferenceFile, onTabMenu } = props;
			const hostHeaderPresent = useHostHeaderTablistPresent();
			const activeId = state.centerActive;
			if (activeId === null || state.centerTabs.length === 0) return null;
			const tab = state.centerTabs.find((candidate) => candidate.id === activeId);
			if (tab === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.centerPreview,
				style: {
					left,
					right: window.innerWidth - right,
					top,
					bottom
				},
				children: [!hostHeaderPresent && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.centerPreviewTabs,
					role: "tablist",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "tab",
						"aria-selected": false,
						className: sidebar_module_css_default.centerPreviewTab,
						onClick: () => {
							store.reduce((s) => s.centerActive === null ? s : {
								...s,
								centerActive: null
							});
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.centerPreviewLabel,
							children: t("conversationTab")
						})
					}), state.centerTabs.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "tab",
						"aria-selected": candidate.id === activeId,
						className: clsx(sidebar_module_css_default.centerPreviewTab, candidate.id === activeId && sidebar_module_css_default.centerPreviewTabActive),
						title: candidate.title,
						onClick: () => {
							store.reduce((s) => s.centerActive === candidate.id ? s : {
								...s,
								centerActive: candidate.id
							});
						},
						onContextMenu: (event) => {
							event.preventDefault();
							event.stopPropagation();
							store.reduce((s) => s.centerActive === candidate.id ? s : {
								...s,
								centerActive: candidate.id
							});
							onTabMenu({
								tabId: candidate.id,
								x: event.clientX,
								y: event.clientY
							});
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.centerPreviewLabel,
							children: candidate.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.centerPreviewClose,
							"aria-label": t("close"),
							onClick: (event) => {
								event.stopPropagation();
								ctx.betterSidebar?.closeTab(candidate.id, { sessionId });
							},
							children: "×"
						})]
					}, candidate.id))]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.centerPreviewBody,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabContent, {
						tab,
						sessionId,
						cwd,
						expanded: state.expanded,
						onToggleDir: (path) => {
							store.reduce((s) => toggleExpanded(s, path));
						},
						onReferenceFile,
						ctx,
						store,
						visible: true,
						onSubagentJump: () => {},
						onOpenDiff: (diffTab) => {
							store.reduce((s) => openDiffTab(s, CENTER_PANE_ID, diffTab));
						}
					})
				})]
			});
		}
		//#endregion
		//#region src/client/preview-overlay.ts
		/**
		* The conversation preview overlay must start below the host 对话 / 轨迹
		* strip. When file tabs wrap, the second row can paint past a 48px header
		* while `header.getBoundingClientRect().bottom` stays 48 — cover that by
		* taking the max of header and tablist bottoms.
		*/
		function previewOverlayTop(header, tablist, fallback = 48) {
			const bottoms = [header?.bottom, tablist?.bottom].filter((value) => typeof value === "number");
			if (bottoms.length === 0) return fallback;
			return Math.max(...bottoms);
		}
		//#endregion
		//#region src/client/Sidebar.tsx
		/**
		* The sidebar shell: fixed-position panels portalled onto document.body
		* (the core AppFrame owns the left sidebar / center / details columns and
		* has no right-side hole for plugins). The right panel hosts the original
		* workbench; the bottom panel hosts a second, independent workbench. The
		* bottom panel squeezes ONLY the center column (the agent output area): it
		* spans from the app shell's own left sidebar to the right panel's left
		* edge, so neither sidebar gives up any position (the right panel keeps its
		* full height). A persistent two-button cluster at the top-right corner
		* toggles each panel; the right panel's width drags from its left edge, the
		* bottom panel's height from its top edge, and the shared corner drags both
		* at once. The whole layout lives in the per-session store, so switching
		* conversations swaps the sidebar.
		*
		* The shell binds the workbench actions to the store and dispatches tab
		* content to the views. New tool views open from the activity bar
		* (explorer / git / review / terminal; editors open from the explorer).
		* Tabs can be dragged between
		* the right and bottom workbenches, dropped on the conversation header
		* (对话 / 轨迹) to become a center view, or dropped on the chat body
		* to dock into the bottom panel.
		*
		* Narrow (mobile, <768px) viewports show ONLY the right sidebar: entering
		* narrow migrates the bottom panel's tabs INTO the right tree
		* (migrateBottomTabs) — one workbench, the bottom tabs thrown into its
		* strips. The right panel becomes a full-width drawer, the bottom panel
		* and its toggle button disappear, and the layout push is disabled (the
		* drawer floats). Widening does not migrate back: the tabs keep living in
		* the right tree.
		*/
		init_clsx();
		init_state();
		init_breakpoints();
		init_TabBar();
		init_conversation_views();
		init_locales();
		init_sidebar_module_css();
		/** How many consecutive reconnect failures stop the agent-terminals push loop
		* (mirror of the terminal view's own cap; the loop restarts on session switch). */
		const FAILURE_LIMIT = 3;
		/** The activity-bar options for the current state, driven by the tab registry.
		* Hidden tabs (editor/diff) never show; `available` returning false shows
		* a disabled row (e.g. terminal at capacity) instead of hiding the option.
		* Tabs the user disabled in the side card settings are filtered out
		* entirely — re-enabling them is the settings page's job. */
		function buildNewTabOptions(state, ctx, scope) {
			const service = ctx.betterSidebar;
			if (service === void 0) return [];
			return service.getTabs().filter((d) => !d.hidden && service.isTabEnabled(d.id)).sort((a, b) => (a.order ?? 100) - (b.order ?? 100)).map((d) => ({
				id: d.id,
				label: typeof d.title === "function" ? d.title() : d.title,
				disabled: !(d.available?.(ctx, scope, state) ?? true),
				icon: typeof d.icon === "function" ? d.icon(16) : d.icon,
				multi: d.createTab !== void 0
			}));
		}
		function Sidebar(props) {
			const { ctx, store } = props;
			(0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.locale.subscribe(callback), [ctx]), (0, react.useCallback)(() => ctx.locale.getSnapshot().active, [ctx]));
			(0, react.useSyncExternalStore)(subscribeReview, reviewRevision);
			const narrow = useNarrowViewport();
			const sessionList = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.sessions.list.subscribe(callback), [ctx]), (0, react.useCallback)(() => ctx.sessions.list.getSnapshot(), [ctx]));
			const current = sessionList.current;
			const snapshot = (0, react.useSyncExternalStore)((0, react.useCallback)((callback) => store.subscribe(callback), [store]), (0, react.useCallback)(() => store.getSnapshot(), [store]));
			(0, react.useEffect)(() => {
				store.setSession(current);
			}, [current, store]);
			const state = snapshot.state;
			const sessionId = snapshot.sessionId;
			const summaryCwd = sessionId === void 0 ? void 0 : sessionList.byId[sessionId]?.cwd;
			const collapsed = state === void 0 || !state.panelOpen;
			(0, react.useEffect)(() => {
				if (collapsed) document.body.setAttribute("data-dsh-sidebar-collapsed", "");
				else document.body.removeAttribute("data-dsh-sidebar-collapsed");
				return () => {
					document.body.removeAttribute("data-dsh-sidebar-collapsed");
				};
			}, [collapsed]);
			const titleBarCompat = snapshot.prefs.titleBarCompat;
			const titleBarStrip = snapshot.prefs.titleBarStripPx;
			(0, react.useEffect)(() => {
				const root = document.documentElement;
				if (titleBarCompat) {
					document.body.setAttribute("data-dsh-title-bar-compat", "");
					root.style.setProperty("--dsh-title-bar-strip", `${titleBarStrip}px`);
				} else {
					document.body.removeAttribute("data-dsh-title-bar-compat");
					root.style.removeProperty("--dsh-title-bar-strip");
				}
				return () => {
					document.body.removeAttribute("data-dsh-title-bar-compat");
					root.style.removeProperty("--dsh-title-bar-strip");
				};
			}, [titleBarCompat, titleBarStrip]);
			/**
			* Bottom-panel merge on narrow viewports: whenever a session is current
			* while narrow (mount, session switch, or a desktop→narrow transition),
			* throw the bottom tree's tabs into the right tree. Idempotent — after
			* the first migration the bottom tree is empty and the reducer returns
			* the same reference, so this effect settles immediately.
			*/
			(0, react.useEffect)(() => {
				if (!narrow || sessionId === void 0) return;
				store.reduce(migrateBottomTabs);
			}, [
				narrow,
				sessionId,
				store
			]);
			const [fetchedCwd, setFetchedCwd] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setFetchedCwd(void 0);
				if (sessionId === void 0 || summaryCwd !== void 0) return;
				let cancelled = false;
				api.sessionCwd({ sessionId }).then((result) => {
					if (!cancelled) setFetchedCwd(result.cwd);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, [sessionId, summaryCwd]);
			const cwd = summaryCwd ?? fetchedCwd;
			/**
			* Agent terminals push: subscribe to the host's live list of agent-owned
			* terminals for this session (created by the model through the
			* `terminal_create` tool). The host pushes a JSON array on every
			* create / close / exit; the sidebar reconciles the list into tabs
			* (id `agent:<uuid>`, title from the agent). A disconnected socket
			* retries with a short backoff so a refresh or transient drop reattaches
			* the same shell without losing the agent's work — capped like the
			* terminal view's own reconnect loop, so a refused endpoint never spins
			* forever (the next session switch restarts the loop).
			* While the terminal tab type is disabled in settings, pushes are
			* ignored (no auto-added tabs); re-enabling makes the next push converge.
			*/
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				let socket = null;
				let retry;
				let closed = false;
				let failures = 0;
				const connect = () => {
					if (closed) return;
					const url = new URL("/sidebar/ws/agent-terminals", location.origin);
					url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
					url.search = new URLSearchParams({ sessionId }).toString();
					socket = new WebSocket(url.toString());
					socket.onmessage = (event) => {
						if (typeof event.data !== "string") return;
						try {
							const list = JSON.parse(event.data);
							if (!Array.isArray(list)) return;
							store.reduce((s) => ctx.betterSidebar?.isTabEnabled("terminal") === false ? s : reconcileAgentTerminals(s, list));
						} catch {}
					};
					socket.onclose = () => {
						if (closed) return;
						failures += 1;
						if (failures >= FAILURE_LIMIT) {
							console.error("[dsh-better-sidebar] agent-terminals connection failed; stopping reconnect loop", sessionId);
							return;
						}
						retry = window.setTimeout(connect, 2e3);
					};
					socket.onerror = () => {
						socket?.close();
					};
				};
				connect();
				return () => {
					closed = true;
					window.clearTimeout(retry);
					socket?.close();
				};
			}, [sessionId, store]);
			/**
			* Subagent auto-activation: the moment the current conversation spawns its
			* FIRST direct subagent (a 0 → N transition on the list feed), the "auto
			* open" pref is on, and the Subagent tab type is enabled in settings,
			* open the panel (if collapsed) and focus the Subagent page
			* (single-instance: an existing tab is focused, never duplicated).
			* Switching to a session that already has subagents never triggers — its
			* baseline starts at the current count — so a deliberate layout is never
			* fought.
			*/
			const listBaselineRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const prev = listBaselineRef.current;
				listBaselineRef.current = sessionList;
				if (sessionId === void 0 || prev === void 0) return;
				if (!detectNewDirectSubagent(prev, sessionList, sessionId)) return;
				if (!store.getPrefs().autoOpenSubagent) return;
				if (ctx.betterSidebar?.isTabEnabled("subagent") === false) return;
				store.reduce((s) => s.panelOpen ? s : togglePanel(s));
				store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.splits).id
				}));
				ctx.betterSidebar?.openTab({
					type: "subagent",
					title: t("subagent")
				});
			}, [
				sessionList,
				sessionId,
				store,
				ctx
			]);
			/**
			* Job auto-activation: the moment a NEW background job appears for the
			* current conversation (a job id the previous snapshot lacked), the
			* auto-open pref is on, and the Jobs tab type is enabled, open the panel
			* (if collapsed) and focus the Jobs page. Unlike the subagent trigger
			* (0 → N only), ANY new job id triggers: the agent may start several
			* jobs in one session, and each should surface. A fresh page load never
			* triggers — its baseline starts at the current snapshot.
			*/
			const jobBaselineRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const prev = jobBaselineRef.current;
				jobBaselineRef.current = sessionList;
				if (sessionId === void 0 || prev === void 0) return;
				if (!detectNewJob(prev, sessionList, sessionId)) return;
				if (!store.getPrefs().autoOpenJobs) return;
				if (ctx.betterSidebar?.isTabEnabled("subagent") === false) return;
				store.reduce((s) => s.panelOpen ? s : togglePanel(s));
				store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.splits).id
				}));
				ctx.betterSidebar?.openTab({
					type: "subagent",
					title: t("subagent")
				});
			}, [
				sessionList,
				sessionId,
				store,
				ctx
			]);
			/**
			* Topology jump-back: clicking a subagent node on the Subagent page calls
			* the official `openSubagent`, which switches the sidebar to that child
			* session's OWN layout (a fresh child session defaults to the explorer).
			* The README contract says the Subagent page must stay open with the jumped
			* node highlighted — so once the current session becomes the recorded jump
			* target, re-open the Subagent page on top of the child's layout (expanding
			* the panel first if it is collapsed). Only this explicit node click arms
			* the flag, so switching to a subagent session by any other means keeps
			* that session's own layout untouched.
			*/
			const subagentJumpRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const pending = subagentJumpRef.current;
				if (pending === void 0 || sessionId !== pending) return;
				subagentJumpRef.current = void 0;
				store.reduce((s) => s.panelOpen ? s : togglePanel(s));
				store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.splits).id
				}));
				ctx.betterSidebar?.openTab({
					type: "subagent",
					title: t("subagent")
				});
			}, [
				sessionId,
				store,
				ctx
			]);
			const [centerRect, setCenterRect] = (0, react.useState)({
				left: 0,
				right: 0,
				headerBottom: 48
			});
			const centerColRef = (0, react.useRef)(null);
			const draggingRef = (0, react.useRef)(false);
			const measureCenter = (0, react.useCallback)(() => {
				if (draggingRef.current) return;
				const col = centerColRef.current;
				if (col === null) return;
				const rect = col.getBoundingClientRect();
				const header = document.querySelector("[data-slot=\"conversation.session.header\"] header");
				const tablist = header instanceof HTMLElement ? header.querySelector("[role=\"tablist\"]") : null;
				const headerBottom = previewOverlayTop(header instanceof HTMLElement ? header.getBoundingClientRect() : null, tablist instanceof HTMLElement ? tablist.getBoundingClientRect() : null);
				setCenterRect((prev) => prev.left === rect.left && prev.right === rect.right && prev.headerBottom === headerBottom ? prev : {
					left: rect.left,
					right: rect.right,
					headerBottom
				});
			}, []);
			(0, react.useEffect)(() => {
				let disposed = false;
				let observer;
				const locate = () => {
					if (disposed) return;
					const col = document.querySelector("#root [data-slot=\"conversation\"]")?.parentElement;
					if (col === void 0) {
						if (centerColRef.current !== null) {
							centerColRef.current = null;
							observer?.disconnect();
							observer = void 0;
						}
						return;
					}
					if (centerColRef.current !== col) {
						centerColRef.current = col;
						observer?.disconnect();
						observer = new ResizeObserver(measureCenter);
						observer.observe(col);
					}
					const header = document.querySelector("[data-slot=\"conversation.session.header\"] header");
					const tablist = header instanceof HTMLElement ? header.querySelector("[role=\"tablist\"]") : null;
					if (header instanceof HTMLElement) observer?.observe(header);
					if (tablist instanceof HTMLElement) observer?.observe(tablist);
					measureCenter();
				};
				locate();
				const watcher = new MutationObserver(locate);
				const root = document.getElementById("root");
				if (root !== null) watcher.observe(root, { childList: true });
				return () => {
					disposed = true;
					observer?.disconnect();
					watcher.disconnect();
					centerColRef.current = null;
				};
			}, [measureCenter]);
			/**
			* Bottom-panel first-expansion auto terminal: the FIRST time the user
			* expands the bottom panel in a session, try to open a fresh terminal tab
			* there. "Try" is literal — the terminal's own quota and enable switch
			* gate the attempt (a full quota or a disabled terminal type makes it a
			* no-op). Gated on the bottomPanelAutoTerminal pref (the terminal tab's
			* nested settings toggle, default on). Only a false→true TRANSITION fires
			* (a panel persisted open never counts as an expansion), and the session's
			* bottomOpenedOnce flag is set atomically with the first fire so later
			* expansions never repeat it.
			*/
			const bottomWasOpenRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (narrow) return;
				if (state === void 0) return;
				const wasOpen = bottomWasOpenRef.current;
				bottomWasOpenRef.current = state.bottomOpen;
				if (wasOpen === void 0 || wasOpen || !state.bottomOpen) return;
				if (state.bottomOpenedOnce) return;
				if (store.getPrefs().bottomPanelAutoTerminal === false) return;
				if (ctx.betterSidebar?.isTabEnabled("terminal") === false) return;
				store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.bottomSplits).id,
					bottomOpenedOnce: true
				}));
				ctx.betterSidebar?.openTab({ type: "terminal" });
			}, [
				state,
				store,
				ctx,
				narrow
			]);
			const panelRef = (0, react.useRef)(null);
			const bottomRef = (0, react.useRef)(null);
			const widthDrag = (0, react.useRef)({
				startX: 0,
				startWidth: 0
			});
			const [tabDragOverChat, setTabDragOverChat] = (0, react.useState)(false);
			const [centerTabMenu, setCenterTabMenu] = (0, react.useState)(null);
			const openCenterTabMenu = (0, react.useCallback)((menu) => {
				setCenterTabMenu(menu);
			}, []);
			const [tabDragOverHeader, setTabDragOverHeader] = (0, react.useState)(false);
			const [draggingWidth, setDraggingWidth] = (0, react.useState)(false);
			const bottomDrag = (0, react.useRef)({
				startY: 0,
				startHeight: 0
			});
			const [draggingBottom, setDraggingBottom] = (0, react.useState)(false);
			const cornerDrag = (0, react.useRef)({
				startX: 0,
				startY: 0,
				startWidth: 0,
				startHeight: 0
			});
			const [draggingCorner, setDraggingCorner] = (0, react.useState)(false);
			const anyDragging = draggingWidth || draggingBottom || draggingCorner;
			useHostHeaderTabSync(ctx, store, openCenterTabMenu);
			(0, react.useEffect)(() => {
				draggingRef.current = anyDragging;
				if (!anyDragging) measureCenter();
			}, [anyDragging, measureCenter]);
			const clampWidth = (width) => Math.min(Math.max(280, Math.round(width)), Math.max(280, window.innerWidth));
			const clampHeight = (height) => Math.min(Math.max(120, Math.round(height)), Math.max(120, window.innerHeight - 280));
			/** Apply a drag size to the DOM without touching React state or the store.
			*  The bottom panel's right edge tracks the right panel's left edge HERE
			*  too — React state only updates on release, so the inline right must be
			*  written directly or the bottom panel would lag the sidebar mid-drag. */
			const applyDrag = (width, height) => {
				panelRef.current?.style.setProperty("width", `${width}px`);
				bottomRef.current?.style.setProperty("height", `${height}px`);
				bottomRef.current?.style.setProperty("right", `${window.innerWidth - centerRect.right + (width - (state?.width ?? 0))}px`);
				document.documentElement.style.setProperty("--dsh-sidebar-width", `${width}px`);
				document.documentElement.style.setProperty("--dsh-sidebar-height", `${height}px`);
			};
			const dragFrame = (0, react.useRef)(null);
			const pendingDrag = (0, react.useRef)(null);
			const scheduleDrag = (width, height) => {
				pendingDrag.current = {
					width,
					height
				};
				if (dragFrame.current !== null) return;
				dragFrame.current = requestAnimationFrame(() => {
					dragFrame.current = null;
					const pending = pendingDrag.current;
					if (pending !== null) {
						pendingDrag.current = null;
						applyDrag(pending.width, pending.height);
					}
				});
			};
			/** Flush any pending drag write and stop scheduling (the store commit on
			*  pointer up applies the final clamped values). */
			const stopDragScheduling = () => {
				if (dragFrame.current !== null) {
					cancelAnimationFrame(dragFrame.current);
					dragFrame.current = null;
				}
				pendingDrag.current = null;
			};
			(0, react.useEffect)(() => {
				const width = !narrow && snapshot.state?.panelOpen === true ? Math.min(snapshot.state.width, window.innerWidth) : 0;
				const height = !narrow && snapshot.state?.bottomOpen === true ? Math.min(snapshot.state.bottomHeight, window.innerHeight) : 0;
				document.documentElement.style.setProperty("--dsh-sidebar-width", `${width}px`);
				document.documentElement.style.setProperty("--dsh-sidebar-height", `${height}px`);
				return () => {
					document.documentElement.style.removeProperty("--dsh-sidebar-width");
					document.documentElement.style.removeProperty("--dsh-sidebar-height");
				};
			}, [
				narrow,
				snapshot.state?.panelOpen,
				snapshot.state?.width,
				snapshot.state?.bottomOpen,
				snapshot.state?.bottomHeight
			]);
			(0, react.useEffect)(() => {
				if (anyDragging) document.body.setAttribute("data-dsh-sidebar-dragging", "");
				else document.body.removeAttribute("data-dsh-sidebar-dragging");
			}, [anyDragging]);
			const actions = (0, react.useMemo)(() => ({
				closeTab: (paneId, tabId) => {
					const current = store.getSnapshot().state;
					const tab = (current === void 0 ? void 0 : leafWithTab(current.splits, tabId) ?? leafWithTab(current.bottomSplits, tabId))?.tabs.find((candidate) => candidate.id === tabId);
					ctx.betterSidebar?.closeTab(tabId, sessionId === void 0 ? void 0 : {
						sessionId,
						cwd
					});
					if (tab?.type === "terminal") {
						if (isAgentTabId(tabId)) {
							const uuid = agentUuidOf(tabId);
							api.agentPtyClose(uuid).catch(() => {});
						} else if (sessionId !== void 0) api.ptyClose({
							sessionId,
							cwd
						}, tabId).catch(() => {});
					}
				},
				activateTab: (paneId, tabId) => {
					ctx.betterSidebar?.activateTab(tabId, sessionId === void 0 ? void 0 : {
						sessionId,
						cwd
					});
				},
				focusPane: (paneId) => {
					store.reduce((s) => ({
						...s,
						activePane: paneId
					}));
				},
				moveTabToEdge: (payload, toPane, zone) => {
					store.reduce((s) => moveTabToEdge(s, payload.paneId, payload.tabId, toPane, zone, payload.openTab));
				},
				dockTabToCenter: (paneId, tabId) => {
					const prefs = store.getPrefs();
					store.reduce((s) => dockTabToCenter(s, paneId, tabId, void 0, prefs.centerTabOverflow, prefs.centerTabMax));
					const landed = store.getSnapshot().state?.centerTabs.find((tab) => tab.id === tabId)?.title;
					focusLatestCenterView(landed);
				},
				moveTabBefore: (payload, toPane, beforeTabId) => {
					store.reduce((s) => {
						const source = leafWithTab(s.splits, beforeTabId) ?? leafWithTab(s.bottomSplits, beforeTabId);
						const index = source !== void 0 && source.id === toPane ? source.tabs.findIndex((tab) => tab.id === beforeTabId) : -1;
						return moveTab(s, payload.paneId, payload.tabId, toPane, index, payload.openTab);
					});
				},
				resizeSplit: (splitId, index, deltaFrac) => {
					store.reduce((s) => resizeSplitIn(s, splitId, index, deltaFrac));
				}
			}), [
				store,
				sessionId,
				cwd
			]);
			/**
			* The explorer's @-reference button: insert a file chip into the session's
			* composer. The conversation service is resolved lazily through `ctx.get`;
			* a missing service or scope degrades to a logged no-op, never a crash.
			* Defined above the no-session early return — a hook must never sit behind
			* a conditional return (React counts hooks per render).
			*/
			const referenceInChat = (0, react.useCallback)((path) => {
				if (sessionId === void 0) return;
				insertFileRef(ctx, sessionId, fileRefOf(path, cwd));
			}, [
				ctx,
				sessionId,
				cwd
			]);
			const gitKinds = useGitKindMap(sessionId === void 0 ? void 0 : {
				sessionId,
				cwd
			});
			const tabTitleClassOf = (0, react.useCallback)((tab) => {
				const path = workspacePathOfTab(tab);
				return path === void 0 ? void 0 : classOfKind(gitKinds.get(path));
			}, [gitKinds]);
			(0, react.useEffect)(() => {
				if (snapshot.prefs.centerTabOverflow === "wrap") document.body.setAttribute("data-dsh-center-tabs-wrap", "");
				else document.body.removeAttribute("data-dsh-center-tabs-wrap");
				return () => {
					document.body.removeAttribute("data-dsh-center-tabs-wrap");
				};
			}, [snapshot.prefs.centerTabOverflow]);
			if (state === void 0 || sessionId === void 0) return null;
			const onNewTab = (optionId) => {
				const service = ctx.betterSidebar;
				const descriptor = service?.getTab(optionId);
				if (descriptor === void 0) return;
				const title = typeof descriptor.title === "function" ? descriptor.title() : descriptor.title;
				if (optionId === "terminal" && !narrow) store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.bottomSplits).id,
					bottomOpen: true,
					bottomOpenedOnce: true
				}));
				service.openTab({
					type: optionId,
					title
				}, {
					sessionId,
					cwd
				});
			};
			/**
			* The explorer's @-reference button: append `@<relative path>` to the
			* session's composer draft (space-separated). Resolves the session-scope
			* ctx and the conversation input service at click time; a missing service
			* or scope degrades to a logged no-op, never a crash.
			*/
			/** The tab icon from the tab-type registry (shared by every workbench). */
			const tabIconOf = (tab) => {
				const descriptor = ctx.betterSidebar?.getTab(tab.type);
				if (descriptor === void 0) return null;
				return typeof descriptor.icon === "function" ? descriptor.icon(14) : descriptor.icon;
			};
			/**
			* The tab badge from the tab-type registry: a count (99+ capped) or a
			* short text pill. A throwing badge is swallowed (no pill) — the tab
			* strip must never break because a plugin's badge computation failed.
			*/
			const badgeValueOf = (typeId) => {
				const descriptor = ctx.betterSidebar?.getTab(typeId);
				if (descriptor?.badge === void 0) return null;
				try {
					return descriptor.badge(ctx, {
						sessionId,
						cwd
					}, state);
				} catch (error) {
					console.error("[dsh-better-sidebar] tab badge error:", error);
					return null;
				}
			};
			/** Render a badge value as a pill in the given class. */
			const badgePillOf = (value, pillClass) => {
				if (value === null || value === void 0 || value === "") return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: pillClass,
					children: typeof value === "number" ? value > 99 ? "99+" : String(value) : String(value)
				});
			};
			/** The tab badge pill for one open tab (strip labels). */
			const tabBadgeOf = (tab) => badgePillOf(badgeValueOf(tab.type), sidebar_module_css_default.tabBadge);
			/** The badge pill for one activity-bar icon (per type). */
			const activityBadgeOf = (typeId) => badgePillOf(badgeValueOf(typeId), sidebar_module_css_default.activityBadge);
			const stripTabFilter = (tab) => {
				const service = ctx.betterSidebar;
				if (service === void 0) return true;
				const tabs = service.getTabs();
				if (tabs.some((d) => d.id === tab.type && d.createTab !== void 0)) return true;
				if (tabs.some((d) => d.id === tab.type && d.hidden === true)) return true;
				return !tabs.some((d) => d.id === tab.type && !d.hidden && service.isTabEnabled(d.id));
			};
			/**
			* Render one tab's content. `active` (from the workbench) tells whether
			* this tab is the active one in its pane; combined with the panel's
			* open/closed state it gates live views (the Subagent topology pauses its
			* polling while the page is not actually visible). The pane id travels
			* with the tab so diff tabs can split below their source pane.
			*/
			const renderTab = (tab, active, paneId, bottom = false) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabContent, {
				tab,
				sessionId,
				cwd,
				expanded: state.expanded,
				onToggleDir: (path) => {
					store.reduce((s) => toggleExpanded(s, path));
				},
				onReferenceFile: referenceInChat,
				ctx,
				store,
				visible: bottom ? state.bottomOpen && active : state.panelOpen && active,
				onSubagentJump: (childSessionId) => {
					subagentJumpRef.current = childSessionId;
				},
				onOpenDiff: (diffTab) => {
					store.reduce((s) => openDiffTab(s, paneId, diffTab));
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				!narrow && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: clsx(sidebar_module_css_default.headerStripDrop, tabDragOverHeader && sidebar_module_css_default.headerDropActive),
						style: {
							left: centerRect.left + 8,
							right: window.innerWidth - centerRect.right + 8,
							top: Math.max(8, centerRect.headerBottom - 36),
							height: 36
						},
						onDragOver: (event) => {
							if (!event.dataTransfer.types.includes("application/x-dsh-tab")) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "move";
							setTabDragOverHeader(true);
						},
						onDragLeave: (event) => {
							if (!event.currentTarget.contains(event.relatedTarget)) setTabDragOverHeader(false);
						},
						onDrop: (event) => {
							event.preventDefault();
							setTabDragOverHeader(false);
							const payload = parseDrag(event.dataTransfer.getData("application/x-dsh-tab"));
							if (payload === null) return;
							const prefs = store.getPrefs();
							store.reduce((s) => dockTabToCenter(s, payload.paneId, payload.tabId, payload.openTab, prefs.centerTabOverflow, prefs.centerTabMax));
							const landed = store.getSnapshot().state?.centerTabs.find((tab) => tab.id === payload.tabId)?.title;
							focusLatestCenterView(landed);
						},
						children: t("dropToConversation")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: clsx(sidebar_module_css_default.conversationDrop, tabDragOverChat && sidebar_module_css_default.conversationDropActive),
						style: {
							left: centerRect.left + 8,
							right: window.innerWidth - centerRect.right + 8,
							top: centerRect.headerBottom + 4,
							bottom: state.bottomOpen ? Math.min(state.bottomHeight, window.innerHeight) + 8 : 8
						},
						onDragOver: (event) => {
							if (!event.dataTransfer.types.includes("application/x-dsh-tab")) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "move";
							setTabDragOverChat(true);
						},
						onDragLeave: (event) => {
							if (!event.currentTarget.contains(event.relatedTarget)) setTabDragOverChat(false);
						},
						onDrop: (event) => {
							event.preventDefault();
							setTabDragOverChat(false);
							const payload = parseDrag(event.dataTransfer.getData("application/x-dsh-tab"));
							if (payload === null) return;
							store.reduce((s) => dockTabToBottom(s, payload.paneId, payload.tabId, payload.openTab));
						},
						children: t("dropToBottom")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CenterPreview, {
						ctx,
						store,
						state,
						sessionId,
						cwd,
						left: centerRect.left,
						right: centerRect.right,
						top: centerRect.headerBottom,
						bottom: state.bottomOpen ? Math.min(state.bottomHeight, window.innerHeight) : 0,
						onReferenceFile: referenceInChat,
						onTabMenu: openCenterTabMenu
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CenterTabContextMenu, {
						ctx,
						store,
						sessionId,
						menu: centerTabMenu,
						onClose: () => {
							setCenterTabMenu(null);
						}
					})
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: clsx(sidebar_module_css_default.panel, !state.panelOpen && sidebar_module_css_default.panelHidden),
					style: { width: narrow ? "100vw" : Math.min(state.width, window.innerWidth) },
					"data-dragging": anyDragging || void 0,
					children: [
						!narrow && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(sidebar_module_css_default.panelResize, draggingWidth && sidebar_module_css_default.panelResizeActive),
							onPointerDown: (event) => {
								event.preventDefault();
								event.currentTarget.setPointerCapture(event.pointerId);
								widthDrag.current = {
									startX: event.clientX,
									startWidth: state.width
								};
								setDraggingWidth(true);
							},
							onPointerMove: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								const { startX, startWidth } = widthDrag.current;
								const width = clampWidth(startWidth + (startX - event.clientX));
								const height = state.bottomOpen ? Math.min(state.bottomHeight, window.innerHeight) : 0;
								scheduleDrag(width, height);
							},
							onPointerUp: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								event.currentTarget.releasePointerCapture(event.pointerId);
								const { startX, startWidth } = widthDrag.current;
								stopDragScheduling();
								store.reduce((s) => setWidth(s, startWidth + (startX - event.clientX)));
								setDraggingWidth(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.panelBody,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Workbench, {
								state,
								newTabOptions: buildNewTabOptions(state, ctx, {
									sessionId,
									cwd
								}),
								actions,
								onNewTab,
								renderTab,
								getTabIcon: tabIconOf,
								getTabBadge: tabBadgeOf,
								getTabTitleClass: tabTitleClassOf,
								stripTabFilter,
								getActivityBadge: activityBadgeOf,
								activityBarSide: "right",
								panelOpen: state.panelOpen,
								onTogglePanel: () => {
									store.reduce(togglePanel);
								}
							})
						}),
						!narrow && state.panelOpen && state.bottomOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.cornerHandle,
							"data-dragging": draggingCorner || void 0,
							onPointerDown: (event) => {
								event.preventDefault();
								event.currentTarget.setPointerCapture(event.pointerId);
								cornerDrag.current = {
									startX: event.clientX,
									startY: event.clientY,
									startWidth: state.width,
									startHeight: state.bottomHeight
								};
								setDraggingCorner(true);
							},
							onPointerMove: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								const { startX, startY, startWidth, startHeight } = cornerDrag.current;
								const width = clampWidth(startWidth + (startX - event.clientX));
								const height = clampHeight(startHeight + (startY - event.clientY));
								scheduleDrag(width, height);
							},
							onPointerUp: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								event.currentTarget.releasePointerCapture(event.pointerId);
								const { startX, startY, startWidth, startHeight } = cornerDrag.current;
								stopDragScheduling();
								store.reduce((s) => setBottomHeight(setWidth(s, startWidth + (startX - event.clientX)), startHeight + (startY - event.clientY)));
								setDraggingCorner(false);
							}
						})
					]
				}),
				!narrow && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: bottomRef,
					className: clsx(sidebar_module_css_default.bottomPanel, !state.bottomOpen && sidebar_module_css_default.bottomPanelHidden),
					style: {
						height: Math.min(state.bottomHeight, window.innerHeight),
						left: centerRect.left,
						right: window.innerWidth - centerRect.right,
						borderRight: state.panelOpen ? "1px solid var(--dsw-alias-border-l2)" : void 0
					},
					"data-dragging": draggingBottom || draggingCorner || void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(sidebar_module_css_default.bottomResize, draggingBottom && sidebar_module_css_default.bottomResizeActive),
							onPointerDown: (event) => {
								event.preventDefault();
								event.currentTarget.setPointerCapture(event.pointerId);
								bottomDrag.current = {
									startY: event.clientY,
									startHeight: state.bottomHeight
								};
								setDraggingBottom(true);
							},
							onPointerMove: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								const { startY, startHeight } = bottomDrag.current;
								const height = clampHeight(startHeight + (startY - event.clientY));
								scheduleDrag(Math.min(state.width, window.innerWidth), height);
							},
							onPointerUp: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								event.currentTarget.releasePointerCapture(event.pointerId);
								const { startY, startHeight } = bottomDrag.current;
								stopDragScheduling();
								store.reduce((s) => setBottomHeight(s, startHeight + (startY - event.clientY)));
								setDraggingBottom(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("collapseBottomPanel"),
							side: "bottom",
							delayMs: 500,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.bottomClose,
								"aria-label": t("collapseBottomPanel"),
								onClick: () => {
									store.reduce(toggleBottomPanel);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.panelBody,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Workbench, {
								state,
								tree: state.bottomSplits,
								newTabOptions: buildNewTabOptions(state, ctx, {
									sessionId,
									cwd
								}),
								actions,
								onNewTab,
								renderTab: (tab, active, paneId) => renderTab(tab, active, paneId, true),
								getTabIcon: tabIconOf,
								getTabBadge: tabBadgeOf,
								getTabTitleClass: tabTitleClassOf,
								stripTabFilter,
								getActivityBadge: activityBadgeOf,
								showActivityBar: false
							})
						})
					]
				})
			] });
		}
		//#endregion
		//#region src/client/link-intercept.ts
		/**
		* Chat/GUI external-link interception: clicking an http(s) link that points
		* OUTSIDE the GUI (chat messages, tool rows, prose mentions) opens the
		* sidebar instead of a new browser tab. Gated by the caller through
		* `takeoverEnabled(url)` — the `browserInterceptLinks` master, the URL's
		* protocol flag (`browserInterceptHttp` / `browserInterceptHttps`) and the
		* target tab's enable switch — and a Ctrl/Cmd/Shift/Alt-modified click
		* always bypasses the takeover so the user can still force a real browser
		* tab.
		*
		* Only the GUI's OWN document is watched — links inside the browser tab's
		* sandboxed iframe live in another document and never bubble here (and
		* their clicks must keep working inside the sidebar).
		*/
		/** The pure decision: the URL to open in the sidebar, or null to let the
		*  click fall through. Extracted so the policy is unit-testable without a
		*  DOM. `anchorHref` must be the ABSOLUTE href (`<a>.href` already is).
		*  The protocol/same-origin policy lives HERE; the prefs gates (master +
		*  protocol flags + target enablement) live in the caller's
		*  `takeoverEnabled(url)` callback. */
		function shouldInterceptLink(anchorHref, selfOrigin) {
			let url;
			try {
				url = new URL(anchorHref);
			} catch {
				return null;
			}
			if (url.protocol !== "http:" && url.protocol !== "https:") return null;
			try {
				if (url.origin === new URL(selfOrigin).origin) return null;
			} catch {}
			return url.href;
		}
		/** Whether a left-click may be taken over (unmodified left click only). */
		function isPlainLeftClick(event) {
			return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
		}
		/**
		* Register the document-level click capture that funnels external links
		* into the sidebar. Returns the disposer (HMR-safe).
		*/
		function registerLinkInterception(opts) {
			const onClick = (event) => {
				if (!isPlainLeftClick(event)) return;
				if (event.defaultPrevented) return;
				const target = event.target;
				if (target === null || typeof target.closest !== "function") return;
				const anchor = target.closest("a[href]");
				if (anchor === null) return;
				const url = shouldInterceptLink(anchor.href, opts.selfOrigin);
				if (url === null) return;
				if (!opts.takeoverEnabled(new URL(url))) return;
				event.preventDefault();
				opts.openInSidebar(url);
			};
			document.addEventListener("click", onClick, true);
			return () => {
				document.removeEventListener("click", onClick, true);
			};
		}
		//#endregion
		//#region src/client/ime-guard.ts
		/**
		* IME-composition key guard.
		*
		* While a Chinese/Japanese/Korean input method is composing (the user is
		* picking a candidate from the IME window), every pressed key BELONGS to the
		* input method: arrows move the candidate highlight, Enter/Space confirm the
		* composition, Escape cancels it. Page code must not process those keys —
		* a component that does (a number stepper calling preventDefault() on
		* ArrowUp/ArrowDown, a submit handler reacting to Enter, ...) silently
		* breaks the IME: candidates stop responding, the composition gets torn
		* apart, and only bare letters come out.
		*
		* This guard enforces that rule at the document boundary: a capture-phase
		* keydown/keyup listener that stops the event from propagating further
		* whenever a composition is in progress. Because it runs in the capture
		* phase on `document` — the outermost node — it fires BEFORE React's
		* delegated handlers (attached at the root container) and before any native
		* target/bubble listener, so an inlined third-party component (e.g. the
		* Univer office UI bundled into this plugin) can never intercept
		* composition keys. The browser's native IME processing is untouched:
		* stopPropagation only silences page JS, not the default action.
		*
		* The composition signal follows the DSH core convention (InputBar's IME
		* guard, issue #535): `isComposing` for modern engines, keyCode 229 as the
		* legacy signal engines emit without isComposing.
		*/
		/** The pure decision: is this keyboard event part of an IME composition? */
		function isImeComposition(event) {
			return event.isComposing || event.keyCode === 229;
		}
		/**
		* Register the document-level capture guard. Returns the disposer
		* (HMR-safe; call through `ctx.effect`).
		*/
		function registerImeGuard() {
			const onKey = (event) => {
				if (isImeComposition(event)) event.stopPropagation();
			};
			document.addEventListener("keydown", onKey, true);
			document.addEventListener("keyup", onKey, true);
			return () => {
				document.removeEventListener("keydown", onKey, true);
				document.removeEventListener("keyup", onKey, true);
			};
		}
		//#endregion
		//#region src/client/editor-reveal.ts
		const pending = /* @__PURE__ */ new Map();
		const listeners = /* @__PURE__ */ new Set();
		function requestReveal(path, range) {
			if (range.start < 1) return;
			pending.set(path, {
				start: range.start,
				end: Math.max(range.start, range.end),
				...range.selected !== void 0 && range.selected !== "" ? { selected: range.selected } : {}
			});
			for (const listener of listeners) listener();
		}
		//#endregion
		//#region src/client/composer-file-drop.ts
		init_conversation_input();
		function sessionIdOf(ctx) {
			return ctx.sessions.list.getSnapshot().current;
		}
		function overComposer(target) {
			if (!(target instanceof Element)) return false;
			return target.closest("[data-composer-card]") !== null;
		}
		/** A path-like @-token (has `/`, `.`, or a line span) — not `@pluginId`. */
		function looksLikeFileAt(text) {
			const ref = parseAtToken(text);
			if (ref === null) return null;
			if (ref.lines !== void 0) return ref;
			if (ref.path.includes("/") || ref.path.includes("\\") || ref.path.includes(".")) return ref;
			return null;
		}
		function refFromTransfer(transfer) {
			const custom = transfer.getData(FILE_REF_MIME);
			if (custom !== "") return decodeFileRef(custom);
			return looksLikeFileAt(transfer.getData("text/plain"));
		}
		/** True when (x,y) sits in any box of `el` or its descendants. */
		function coversPoint(el, x, y, pad = 0) {
			const nodes = [el, ...el.querySelectorAll("*")];
			for (const node of nodes) {
				const box = node.getBoundingClientRect();
				if (x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad) return true;
			}
			return false;
		}
		/** Draft offset under the pointer (the textarea sits ON TOP of the chips). */
		function caretOffsetAt(x, y) {
			const doc = document;
			if (typeof doc.caretPositionFromPoint === "function") {
				const pos = doc.caretPositionFromPoint(x, y);
				if (pos !== null && pos.offsetNode instanceof HTMLTextAreaElement) return pos.offset;
			}
			if (typeof doc.caretRangeFromPoint === "function") {
				const range = doc.caretRangeFromPoint(x, y);
				if (range !== null && range.startContainer instanceof HTMLTextAreaElement) return range.startOffset;
			}
			return null;
		}
		function occurrenceAtOffset(occurrences, offset) {
			if (occurrences === void 0) return null;
			for (const item of occurrences) {
				const span = item.length !== void 0 && item.length > 0 ? item.length : 1;
				if (offset >= item.offset && offset <= item.offset + span) return item.occurrenceId;
			}
			return null;
		}
		/**
		* The chip/text-ref backdrop is `pointer-events: none` and sits UNDER the
		* transparent textarea, so hit-testing must use geometry, not the event
		* target / elementsFromPoint.
		*/
		function chipOccurrenceAt(card, x, y) {
			for (const node of card.querySelectorAll("[data-decoration=\"chip\"]")) {
				if (!coversPoint(node, x, y, 8)) continue;
				const id = Number(node.dataset.occurrence);
				if (Number.isFinite(id)) return id;
			}
			return null;
		}
		/** `@path` fallback when insertReference was unavailable (plain-text decoration). */
		function textRefAt(card, x, y) {
			for (const node of card.querySelectorAll("[data-decoration=\"text-ref\"]")) {
				if (!coversPoint(node, x, y)) continue;
				return looksLikeFileAt(node.textContent ?? "");
			}
			return null;
		}
		function fileRefFromChip(ctx, sessionId, occurrenceId) {
			const occurrence = sessionInput(ctx, sessionId)?.state.getSnapshot().occurrences?.find((item) => item.occurrenceId === occurrenceId);
			if (occurrence === void 0) return null;
			if (occurrence.source === "file") return decodeFileRef(occurrence.ref);
			return looksLikeFileAt(occurrence.clipboardText ?? "") ?? decodeFileRef(occurrence.ref);
		}
		function openFileRef(ctx, sessionId, ref) {
			const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
			const absolute = ref.abs ?? resolveSidebarPath(cwd, ref.path);
			const title = fileBaseName$1(absolute);
			ctx.betterSidebar?.openTab({
				type: "editor",
				title,
				path: absolute,
				id: `editor:${absolute}`
			}, {
				sessionId,
				cwd
			});
			if (ref.lines !== void 0) requestReveal(absolute, {
				start: ref.lines.start,
				end: ref.lines.end,
				selected: ref.selected
			});
		}
		function registerComposerFileDrop(ctx) {
			const onDragOver = (event) => {
				if (!overComposer(event.target) || event.dataTransfer === null) return;
				if (!event.dataTransfer.types.includes("application/x-dsh-file-ref")) return;
				event.preventDefault();
				event.stopPropagation();
				event.dataTransfer.dropEffect = "copy";
			};
			const onDrop = (event) => {
				if (!overComposer(event.target) || event.dataTransfer === null) return;
				if (!event.dataTransfer.types.includes("application/x-dsh-file-ref") && !event.dataTransfer.types.includes("text/plain")) return;
				const ref = refFromTransfer(event.dataTransfer);
				if (ref === null) return;
				const sessionId = sessionIdOf(ctx);
				if (sessionId === void 0) return;
				event.preventDefault();
				event.stopPropagation();
				insertFileRef(ctx, sessionId, ref);
			};
			const resolveChip = (event) => {
				if (!(event.target instanceof Element)) return null;
				const card = event.target.closest("[data-composer-card]");
				if (card === null) return null;
				const sessionId = sessionIdOf(ctx);
				if (sessionId === void 0) return null;
				const backdrop = card.querySelector("[data-input-backdrop]");
				const prev = backdrop?.style.pointerEvents;
				if (backdrop !== null && backdrop !== void 0) backdrop.style.pointerEvents = "auto";
				try {
					const hit = document.elementFromPoint(event.clientX, event.clientY);
					const chip = hit instanceof Element ? hit.closest("[data-decoration=\"chip\"]") : null;
					if (chip !== null) {
						const id = Number(chip.dataset.occurrence);
						if (Number.isFinite(id)) return fileRefFromChip(ctx, sessionId, id);
					}
					const textRef = hit instanceof Element ? hit.closest("[data-decoration=\"text-ref\"]") : null;
					if (textRef !== null) return looksLikeFileAt(textRef.textContent ?? "");
				} finally {
					if (backdrop !== null && backdrop !== void 0) backdrop.style.pointerEvents = prev ?? "";
				}
				const input = sessionInput(ctx, sessionId);
				const caret = caretOffsetAt(event.clientX, event.clientY);
				const occurrenceId = occurrenceAtOffset(input?.state.getSnapshot().occurrences, caret ?? -1) ?? chipOccurrenceAt(card, event.clientX, event.clientY);
				if (occurrenceId !== null) return fileRefFromChip(ctx, sessionId, occurrenceId);
				return textRefAt(card, event.clientX, event.clientY);
			};
			const onChipPointer = (event) => {
				if (event.button !== 0) return;
				const ref = resolveChip(event);
				if (ref === null) return;
				event.preventDefault();
				event.stopPropagation();
				const sessionId = sessionIdOf(ctx);
				if (sessionId === void 0) return;
				if (event.type === "mousedown") openFileRef(ctx, sessionId, ref);
			};
			const onPaste = (event) => {
				if (!overComposer(event.target) || event.clipboardData === null) return;
				const custom = event.clipboardData.getData(FILE_REF_MIME);
				const ref = custom !== "" ? decodeFileRef(custom) : looksLikeFileAt(event.clipboardData.getData("text/plain"));
				if (ref === null) return;
				const sessionId = sessionIdOf(ctx);
				if (sessionId === void 0) return;
				event.preventDefault();
				event.stopPropagation();
				insertFileRef(ctx, sessionId, ref);
			};
			document.addEventListener("dragover", onDragOver, true);
			document.addEventListener("drop", onDrop, true);
			document.addEventListener("paste", onPaste, true);
			document.addEventListener("mousedown", onChipPointer, true);
			document.addEventListener("click", onChipPointer, true);
			return () => {
				document.removeEventListener("dragover", onDragOver, true);
				document.removeEventListener("drop", onDrop, true);
				document.removeEventListener("paste", onPaste, true);
				document.removeEventListener("mousedown", onChipPointer, true);
				document.removeEventListener("click", onChipPointer, true);
			};
		}
		//#endregion
		//#region src/client/composer-chip-layout.ts
		init_composer_chip_caret();
		init_conversation_input();
		init_dom_sync();
		const MAX_PAD_SPACES = 80;
		function spacesForOverflow(extraPx, spaceWidth) {
			if (spaceWidth <= 0 || extraPx <= 0) return 1;
			return Math.min(MAX_PAD_SPACES, Math.max(1, Math.ceil(extraPx / spaceWidth)));
		}
		function spacesToClearChip(chip, spaceWidth) {
			const label = chip.querySelector(":scope > span");
			const box = label instanceof HTMLElement ? label : chip;
			if (spaceWidth <= 0) return 1;
			return spacesForOverflow(box.getBoundingClientRect().right + 6 - chip.getBoundingClientRect().right, spaceWidth);
		}
		function measureSpaceWidth(el) {
			const probe = document.createElement("span");
			probe.textContent = "          ";
			const cs = getComputedStyle(el);
			probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
			document.body.appendChild(probe);
			const width = probe.getBoundingClientRect().width / 10;
			probe.remove();
			return width > .5 ? width : 8;
		}
		/** True when only the host gap (spaces / end) follows this chip. */
		function chipHasNoUserText(draft, objectOffset, length) {
			const spanLen = length !== void 0 && length > 0 ? length : draft[objectOffset] === "￼" ? 1 : 0;
			if (spanLen <= 0) return false;
			let i = objectOffset + spanLen;
			while (draft[i] === " ") i += 1;
			return draft[i] === void 0;
		}
		function padDraftToClearPills(ctx) {
			const sessionId = ctx.sessions.list.getSnapshot().current;
			if (sessionId === void 0) return false;
			const input = sessionInput(ctx, sessionId);
			if (input === void 0) return false;
			const el = composerTextarea();
			if (el === null) return false;
			const spaceWidth = measureSpaceWidth(el);
			const snapshot = input.state.getSnapshot();
			let next = snapshot.draft;
			for (const chip of document.querySelectorAll("[data-composer-card] [data-decoration=\"chip\"]")) {
				chip.style.paddingRight = "";
				const id = Number(chip.dataset.occurrence);
				const occurrence = snapshot.occurrences?.find((item) => item.occurrenceId === id);
				if (occurrence === void 0) continue;
				const length = occurrenceChipLength(next, occurrence);
				if (!chipHasNoUserText(next, occurrence.offset, length)) continue;
				next = padSpacesAfterObject(next, occurrence.offset, spacesToClearChip(chip, spaceWidth), length);
			}
			if (next === snapshot.draft) return false;
			const caret = el.selectionStart ?? next.length;
			const keepCaret = snapshot.occurrences?.some((item) => caretHitsChip(snapshot.draft, caret, occurrenceChipLength(snapshot.draft, item))) === true;
			input.setDraft(next);
			if (keepCaret) requestAnimationFrame(() => {
				placeComposerCaretAfterChips(snapshot.occurrences);
			});
			return true;
		}
		/** Keep composer file chips from overlapping after insert / draft edits. */
		function registerComposerChipLayout(ctx) {
			let frame = 0;
			const schedule = () => {
				if (frame !== 0 || isPluginDragActive()) return;
				frame = window.requestAnimationFrame(() => {
					frame = 0;
					if (isPluginDragActive()) return;
					padDraftToClearPills(ctx);
				});
			};
			const observer = new MutationObserver(schedule);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			window.addEventListener("resize", schedule);
			schedule();
			return () => {
				observer.disconnect();
				window.removeEventListener("resize", schedule);
				if (frame !== 0) window.cancelAnimationFrame(frame);
			};
		}
		//#endregion
		//#region src/client/chat-file-chips.ts
		init_dom_sync();
		init_sidebar_module_css();
		const FENCE = /```([^\n`]+):(\d+)(?:-(\d+))?\n[\s\S]*?```/g;
		const AT_TOKEN = /@[^\s]+/g;
		/** Host at-file-mention / folder drop: `@path` with a slash, a dot, or a line span. */
		function pathMentionOf(token) {
			return looksLikeFileAt(token);
		}
		function parseSentFileFence(info, start, end) {
			const path = info.trim();
			if (path === "") return null;
			const from = Number(start);
			const to = end !== void 0 ? Number(end) : from;
			if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) return null;
			return {
				path,
				lines: {
					start: from,
					end: to
				}
			};
		}
		function splitAtMentions(text) {
			const out = [];
			let cursor = 0;
			AT_TOKEN.lastIndex = 0;
			let match;
			while ((match = AT_TOKEN.exec(text)) !== null) {
				const ref = pathMentionOf(match[0]);
				if (ref === null) continue;
				if (match.index > cursor) out.push({
					kind: "text",
					text: text.slice(cursor, match.index)
				});
				out.push({
					kind: "chip",
					ref
				});
				cursor = match.index + match[0].length;
			}
			if (cursor === 0) return text === "" ? [] : [{
				kind: "text",
				text
			}];
			if (cursor < text.length) out.push({
				kind: "text",
				text: text.slice(cursor)
			});
			return out;
		}
		function splitUserFences(text) {
			const out = [];
			let cursor = 0;
			FENCE.lastIndex = 0;
			let match;
			while ((match = FENCE.exec(text)) !== null) {
				const ref = parseSentFileFence(match[1] ?? "", match[2] ?? "", match[3]);
				if (ref === null) continue;
				if (match.index > cursor) out.push(...splitAtMentions(text.slice(cursor, match.index)));
				out.push({
					kind: "chip",
					ref
				});
				cursor = match.index + match[0].length;
			}
			if (cursor === 0) {
				const mentions = splitAtMentions(text);
				return mentions.some((part) => part.kind === "chip") ? mentions : [];
			}
			if (cursor < text.length) out.push(...splitAtMentions(text.slice(cursor)));
			return out;
		}
		function decorateBubble(bubble, sessionId, ctx) {
			if (bubble.querySelector("[data-dsh-chat-chip]")) return;
			const parts = splitUserFences(bubble.textContent ?? "");
			if (parts.length === 0) return;
			bubble.replaceChildren();
			for (const part of parts) {
				if (part.kind === "text" && part.text !== void 0 && part.text !== "") {
					bubble.append(part.text);
					continue;
				}
				if (part.ref === void 0) continue;
				const button = document.createElement("button");
				button.type = "button";
				button.className = sidebar_module_css_default.chatFileChip ?? "";
				button.dataset.dshChatChip = "";
				button.textContent = fileChipLabel(part.ref);
				const ref = part.ref;
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					openFileRef(ctx, sessionId, ref);
				});
				bubble.append(button);
			}
		}
		function registerChatFileChips(ctx) {
			let frame = 0;
			const paint = () => {
				if (isPluginDragActive()) return;
				const sessionId = ctx.sessions.list.getSnapshot().current;
				if (sessionId === void 0) return;
				for (const bubble of document.querySelectorAll("[data-time-hover-root] [class*=\"bubble\"]")) decorateBubble(bubble, sessionId, ctx);
			};
			const schedule = () => {
				if (frame !== 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = 0;
					paint();
				});
			};
			const observer = new MutationObserver(schedule);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				characterData: true
			});
			schedule();
			return () => {
				observer.disconnect();
				if (frame !== 0) window.cancelAnimationFrame(frame);
			};
		}
		//#endregion
		//#region src/client/file-trigger.ts
		function registerFileTriggerSource(ctx) {
			const slash = ctx.get("inputTriggers");
			if (slash === void 0 || typeof slash.registerSource !== "function") return () => {};
			const source = {
				trigger: "@",
				name: FILE_SOURCE,
				order: 20,
				candidates: () => Promise.resolve([]),
				onPick: () => void 0,
				codec: {
					clipboardText: (raw) => {
						const ref = decodeFileRef(raw);
						return ref === null ? `@${raw}` : fileClipboardText(ref);
					},
					serialize: (raw, _signal) => Promise.resolve(serializeFileRef(raw))
				}
			};
			return slash.registerSource(source);
		}
		//#endregion
		//#region src/client/settings-nav-icon.ts
		/**
		* Mark this plugin's row in the DSH settings navigation so its bundled CSS
		* can replace the shell's fallback gear with the Side card glyph.
		*
		* DSH 0.1.x projects only `id`, `order`, and `label` from a
		* `settings.section` registration, then chooses icons inside the settings
		* shell from a closed list of built-in ids. Until that public contract grows
		* an icon field, the plugin identifies only its own localized row after the
		* dialog mounts. The marker owns no shell structure and is removed on fiber
		* disposal, so the adaptation remains HMR-safe.
		*/
		const SETTINGS_NAV_MARKER = "data-dsh-better-sidebar-settings-nav";
		/**
		* Keep the marker on the settings-nav button whose visible text is this
		* plugin's current localized section label.
		* @param label - locale-aware label resolver used by the section registration.
		* @returns disposer that disconnects observation and removes owned markers.
		*/
		function registerSettingsNavIcon(label) {
			let disposed = false;
			const sync = () => {
				if (disposed) return;
				if (document.body.hasAttribute("data-dsh-tab-dragging") || document.body.hasAttribute("data-dsh-file-dragging")) return;
				const currentLabel = label().trim();
				const buttons = document.querySelectorAll("[role=\"dialog\"] nav button");
				for (const button of buttons) if (currentLabel.length > 0 && button.textContent?.trim() === currentLabel) button.setAttribute(SETTINGS_NAV_MARKER, "");
				else button.removeAttribute(SETTINGS_NAV_MARKER);
			};
			sync();
			const observer = new MutationObserver(sync);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				characterData: true
			});
			return () => {
				disposed = true;
				observer.disconnect();
				document.querySelectorAll(`[${SETTINGS_NAV_MARKER}]`).forEach((element) => {
					element.removeAttribute(SETTINGS_NAV_MARKER);
				});
			};
		}
		//#endregion
		//#region src/client/prefs.ts
		init_prefs_shared();
		/** Validate one raw resolved value into {@link SidebarPrefs}. Used for the
		* settings.get payload AND the settings.update response (both carry the
		* layered resolved value); any malformed field falls back to its default.
		* @param value - the raw resolved section from the settings wire.
		* @returns validated prefs (always well-formed).
		*/
		function parsePrefs(value) {
			if (value === null || typeof value !== "object") return { ...SIDEBAR_PREFS_DEFAULTS };
			const record = value;
			return {
				openByDefault: typeof record.openByDefault === "boolean" ? record.openByDefault : SIDEBAR_PREFS_DEFAULTS.openByDefault,
				defaultWidthPercent: typeof record.defaultWidthPercent === "number" && Number.isFinite(record.defaultWidthPercent) ? clampWidthPercent(record.defaultWidthPercent) : SIDEBAR_PREFS_DEFAULTS.defaultWidthPercent,
				autoOpenSubagent: typeof record.autoOpenSubagent === "boolean" ? record.autoOpenSubagent : SIDEBAR_PREFS_DEFAULTS.autoOpenSubagent,
				autoOpenJobs: typeof record.autoOpenJobs === "boolean" ? record.autoOpenJobs : SIDEBAR_PREFS_DEFAULTS.autoOpenJobs,
				agentTerminalTools: typeof record.agentTerminalTools === "boolean" ? record.agentTerminalTools : SIDEBAR_PREFS_DEFAULTS.agentTerminalTools,
				bottomPanelAutoTerminal: typeof record.bottomPanelAutoTerminal === "boolean" ? record.bottomPanelAutoTerminal : SIDEBAR_PREFS_DEFAULTS.bottomPanelAutoTerminal,
				terminalFontFamily: typeof record.terminalFontFamily === "string" ? record.terminalFontFamily : SIDEBAR_PREFS_DEFAULTS.terminalFontFamily,
				terminalFontSize: typeof record.terminalFontSize === "number" && Number.isFinite(record.terminalFontSize) ? clampTerminalFontSize(record.terminalFontSize) : SIDEBAR_PREFS_DEFAULTS.terminalFontSize,
				interceptOpenPath: typeof record.interceptOpenPath === "boolean" ? record.interceptOpenPath : SIDEBAR_PREFS_DEFAULTS.interceptOpenPath,
				titleBarCompat: typeof record.titleBarCompat === "boolean" ? record.titleBarCompat : SIDEBAR_PREFS_DEFAULTS.titleBarCompat,
				titleBarStripPx: typeof record.titleBarStripPx === "number" && Number.isFinite(record.titleBarStripPx) ? clampTitleBarStrip(record.titleBarStripPx) : SIDEBAR_PREFS_DEFAULTS.titleBarStripPx,
				htmlViewerNoSandbox: typeof record.htmlViewerNoSandbox === "boolean" ? record.htmlViewerNoSandbox : SIDEBAR_PREFS_DEFAULTS.htmlViewerNoSandbox,
				htmlViewerDefaultUnsafe: typeof record.htmlViewerDefaultUnsafe === "boolean" ? record.htmlViewerDefaultUnsafe : SIDEBAR_PREFS_DEFAULTS.htmlViewerDefaultUnsafe,
				browserNoSandbox: typeof record.browserNoSandbox === "boolean" ? record.browserNoSandbox : SIDEBAR_PREFS_DEFAULTS.browserNoSandbox,
				browserInterceptLinks: typeof record.browserInterceptLinks === "boolean" ? record.browserInterceptLinks : SIDEBAR_PREFS_DEFAULTS.browserInterceptLinks,
				browserInterceptHttp: typeof record.browserInterceptHttp === "boolean" ? record.browserInterceptHttp : SIDEBAR_PREFS_DEFAULTS.browserInterceptHttp,
				browserInterceptHttps: typeof record.browserInterceptHttps === "boolean" ? record.browserInterceptHttps : SIDEBAR_PREFS_DEFAULTS.browserInterceptHttps,
				centerTabOverflow: record.centerTabOverflow === "wrap" || record.centerTabOverflow === "scroll" ? record.centerTabOverflow : SIDEBAR_PREFS_DEFAULTS.centerTabOverflow,
				centerTabMax: typeof record.centerTabMax === "number" && Number.isFinite(record.centerTabMax) ? clampCenterTabMax(record.centerTabMax) : SIDEBAR_PREFS_DEFAULTS.centerTabMax,
				reviewDoneSessionLimit: typeof record.reviewDoneSessionLimit === "number" && Number.isFinite(record.reviewDoneSessionLimit) ? clampReviewDoneSessions(record.reviewDoneSessionLimit) : SIDEBAR_PREFS_DEFAULTS.reviewDoneSessionLimit,
				editorMinimap: typeof record.editorMinimap === "boolean" ? record.editorMinimap : SIDEBAR_PREFS_DEFAULTS.editorMinimap,
				tabsEnabled: booleanMapOf(record.tabsEnabled),
				viewersEnabled: booleanMapOf(record.viewersEnabled),
				pluginSettings: pluginSettingsMapOf(record.pluginSettings)
			};
		}
		/**
		* Validate the plugin-owned settings map (v0.12.0+): `{ descriptorId: { key:
		* value } }`, nested open maps. Any non-object value (or a malformed whole)
		* falls back to the empty map — the schema defaults already guard the wire
		* shape, this is the client's second line.
		*/
		function pluginSettingsMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [id, blob] of Object.entries(value)) if (blob !== null && typeof blob === "object" && !Array.isArray(blob)) out[id] = blob;
			return out;
		}
		/**
		* Validate one enable-switch map (per-tab / per-viewer). Only boolean values
		* survive; a non-object or a non-boolean entry falls back to the empty map /
		* drops the entry — an absent key means the feature stays enabled.
		*/
		function booleanMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [key, item] of Object.entries(value)) if (typeof item === "boolean") out[key] = item;
			return out;
		}
		/**
		* Read the resolved side card preferences through the plugin's settings route.
		* @param settings - the settings wire face (the plugin api by default).
		* @returns validated prefs, or the schema defaults when the route rejects,
		* the namespace is absent, or a stored value violates the contract.
		*/
		async function loadPrefs(settings) {
			try {
				return parsePrefs((await settings.settingsGet()).value);
			} catch {
				return { ...SIDEBAR_PREFS_DEFAULTS };
			}
		}
		//#endregion
		//#region src/client/plugins-shared.ts
		/**
		* Shared vocabulary of the recommended plugin catalogs: the entry shape and
		* the GitHub topic URL. The two catalogs live in sibling modules —
		* `plugins-tabs.ts` (tab registrations) and `plugins-viewers.ts` (file
		* previewer registrations) — and are shown in the two "add plugin" modals
		* (Side card settings → the dashed cards at the end of the 侧边栏内容 /
		* 文件预览 grids).
		*/
		/** The GitHub topic page listing every repo tagged `dsh-better-sidebar`. */
		const PLUGIN_TOPIC_URL = "https://github.com/topics/dsh-better-sidebar";
		//#endregion
		//#region src/client/plugins-tabs.ts
		init_locales();
		/** Tab-registration plugins (alphabetical order). */
		const builtinTabPlugins = [{
			id: "@dsh-external/dsh-sentinel",
			name: "dsh-sentinel 唤醒系统",
			url: "https://github.com/fuhefei/dsh-sentinel",
			description: () => t("pluginSentinelDesc"),
			install: "cd ~/.dsh && dsh plugin --profile web add \"github:fuhefei/dsh-sentinel#v0.7.0\""
		}, {
			id: "dsh-sidebar-qa",
			name: "dsh-sidebar-qa 划选追问",
			url: "https://github.com/ChenRuoT/dsh-sidebar-qa",
			description: () => t("pluginSidebarQaDesc"),
			install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/ChenRuoT/dsh-sidebar-qa.git"
		}];
		//#endregion
		//#region src/client/plugins-viewers.ts
		init_locales();
		/** File-previewer plugins (alphabetical order). */
		const builtinViewerPlugins = [{
			id: "@huanlin/dsh-plugin-better-sidebar-plugin-office",
			name: "Office 预览插件",
			url: "https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office",
			description: () => t("pluginOfficeDesc"),
			install: "cd ~/.dsh && dsh plugin --profile web add @huanlin/dsh-plugin-better-sidebar-plugin-office"
		}];
		//#endregion
		//#region \0dsh-css:/Users/laiweibin/work/workSoftware/dhs-plugins/dsh-better-sidebar/src/client/SideCardSection.module.css.mjs
		const css$1 = ".fPqjPW_section{flex-direction:column;gap:14px;width:100%;max-width:760px;display:flex}.fPqjPW_intro{color:var(--dsw-alias-label-tertiary);margin:0;padding:0 2px;font-size:13px;line-height:20px}.fPqjPW_group{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:16px;flex-direction:column;flex:none;gap:8px;padding:18px 20px 20px;display:flex}.fPqjPW_groupHeading{color:var(--dsw-alias-label-primary);align-items:baseline;gap:7px;padding:0 2px 6px;font-size:13px;font-weight:600;line-height:20px;display:flex}.fPqjPW_count{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;font-weight:400;line-height:18px}.fPqjPW_grid{grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px;display:grid}.fPqjPW_card{border:1px solid var(--dsw-alias-border-l2);font:inherit;color:inherit;cursor:pointer;background:0 0;border-radius:12px;flex-direction:column;transition:background .12s,border-color .12s;display:flex;position:relative}.fPqjPW_card:not(.fPqjPW_cardOn):hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-label-dimmed)}.fPqjPW_cardOn{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-interactive-bg-active)}.fPqjPW_cardMain{border-radius:inherit;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;gap:6px;padding:12px;display:flex}.fPqjPW_cardMain:focus-visible,.fPqjPW_cardGear:focus-visible,.fPqjPW_rowGear:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:2px}.fPqjPW_cardTop{align-items:center;gap:8px;min-width:0;display:flex}.fPqjPW_cardIconChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:28px;height:28px;color:var(--dsw-alias-label-tertiary);border-radius:8px;flex:none;justify-content:center;align-items:center;display:inline-flex}.fPqjPW_cardOn .fPqjPW_cardIconChip{border-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 12%, transparent);color:var(--dsw-alias-button-primary-fill)}.fPqjPW_cardTitle{min-width:0;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;flex:1;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}.fPqjPW_cardOn .fPqjPW_cardTitle{color:var(--dsw-alias-label-primary)}.fPqjPW_cardCheck{background:var(--dsw-alias-button-primary-fill);width:16px;height:16px;color:var(--dsw-alias-bg-layer-3);border-radius:50%;flex:none;justify-content:center;align-items:center;display:inline-flex}.fPqjPW_cardDesc{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:16px;overflow:hidden}.fPqjPW_addCard{border-style:dashed;border-color:var(--dsw-alias-border-l2);text-align:left;align-items:flex-start;padding:12px}.fPqjPW_addCard:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}.fPqjPW_addCard:hover .fPqjPW_cardTitle{color:var(--dsw-alias-label-primary)}.fPqjPW_addCard:hover .fPqjPW_cardIconChip{border-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 35%, transparent);color:var(--dsw-alias-button-primary-fill)}.fPqjPW_addCard:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:2px}.fPqjPW_cardOn .fPqjPW_cardDesc{color:var(--dsw-alias-label-secondary)}.fPqjPW_cardWithGear .fPqjPW_cardDesc{padding-right:30px}.fPqjPW_cardGear{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:50%;justify-content:center;align-items:center;padding:0;display:inline-flex;position:absolute;top:46px;right:12px}.fPqjPW_cardGear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.fPqjPW_rowGear{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.fPqjPW_rowGear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.fPqjPW_row{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:12px 2px;display:flex}.fPqjPW_row:last-child{border-bottom:none}.fPqjPW_rowText{flex-direction:column;gap:4px;min-width:0;display:flex}.fPqjPW_title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.fPqjPW_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.fPqjPW_switch{cursor:pointer;flex:none;display:inline-flex;position:relative}.fPqjPW_switchInput{opacity:0;width:1px;height:1px;margin:0;position:absolute}.fPqjPW_switchTrack{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;align-items:center;width:36px;height:20px;padding:2px;transition:background .15s,border-color .15s;display:inline-flex}.fPqjPW_switchThumb{background:var(--dsw-alias-label-secondary);border-radius:50%;width:14px;height:14px;transition:transform .15s,background .15s;display:block}.fPqjPW_switch:hover .fPqjPW_switchTrack{border-color:var(--dsw-alias-label-dimmed)}.fPqjPW_switchInput:checked+.fPqjPW_switchTrack{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill)}.fPqjPW_switchInput:checked+.fPqjPW_switchTrack .fPqjPW_switchThumb{background:var(--dsw-alias-bg-layer-3);transform:translate(16px)}.fPqjPW_switchInput:focus-visible+.fPqjPW_switchTrack{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.fPqjPW_control{flex:none;align-items:center;gap:6px;display:flex}.fPqjPW_percentInput{width:76px}.fPqjPW_typedInput{width:200px}.fPqjPW_typedInputNumber{width:76px}.fPqjPW_suffix{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}.fPqjPW_popupDialog.fPqjPW_popupDialog{width:min(460px,100%)}.fPqjPW_popupRows{flex-direction:column;gap:10px;width:100%;display:flex}.fPqjPW_popupRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;justify-content:space-between;align-items:center;gap:16px;min-width:0;padding:14px 16px;transition:border-color .16s,background .16s;display:flex}.fPqjPW_popupRow:hover{border-color:var(--dsw-alias-label-dimmed)}.fPqjPW_done{appearance:none;font:inherit;cursor:pointer;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.fPqjPW_done:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.fPqjPW_error{color:var(--dsw-alias-state-error-primary);padding:10px 0 2px;font-size:12px;line-height:17px}.fPqjPW_pluginModal.fPqjPW_pluginModal{width:min(560px,100%)}.fPqjPW_pluginList{flex-direction:column;gap:12px;width:100%;display:flex}.fPqjPW_pluginTopicBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);width:100%;font:inherit;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer;border-radius:8px;padding:6px 12px;font-size:12px;line-height:18px}.fPqjPW_pluginTopicBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}.fPqjPW_pluginTopicBtn:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:1px}.fPqjPW_pluginEmpty{color:var(--dsw-alias-label-tertiary);padding:20px 2px;font-size:12px;line-height:18px}.fPqjPW_pluginEntries{flex-direction:column;gap:10px;display:flex}.fPqjPW_pluginEntry{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;flex-direction:column;gap:4px;padding:12px;display:flex}.fPqjPW_pluginEntryHead{justify-content:space-between;align-items:center;gap:12px;display:flex}.fPqjPW_pluginEntryActions{flex:none;align-items:center;gap:6px;display:inline-flex}.fPqjPW_pluginJumpBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);font:inherit;cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:8px;flex:none;padding:3px 12px;font-size:12px;line-height:1.5}.fPqjPW_pluginJumpBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}.fPqjPW_pluginJumpBtn:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:1px}.fPqjPW_pluginName{appearance:none;min-width:0;font:inherit;color:var(--dsw-alias-label-primary);text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;background:0 0;border:0;padding:0;font-size:13px;font-weight:600;line-height:20px;text-decoration:none;overflow:hidden}.fPqjPW_pluginName:hover{color:var(--dsw-alias-button-primary-fill);text-decoration:underline}.fPqjPW_pluginDesc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.fPqjPW_pluginInstall{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);white-space:nowrap;border-radius:8px;padding:6px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:16px;display:block;overflow-x:auto}.fPqjPW_pluginCopyBtn{appearance:none;font:inherit;cursor:pointer;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border:1px solid #0000;border-radius:8px;flex:none;padding:3px 12px;font-size:12px;line-height:1.5}.fPqjPW_pluginCopyBtn:hover{background:var(--dsw-alias-button-primary-hover)}.fPqjPW_pluginCopyBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}@media (prefers-reduced-motion:reduce){.fPqjPW_card,.fPqjPW_switchTrack,.fPqjPW_switchThumb{transition:none}}";
		const tagId$1 = "dsh-external/dsh-better-sidebar/SideCardSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-external/dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var SideCardSection_module_css_default = {
			"cardWithGear": "fPqjPW_cardWithGear",
			"intro": "fPqjPW_intro",
			"percentInput": "fPqjPW_percentInput",
			"grid": "fPqjPW_grid",
			"cardOn": "fPqjPW_cardOn",
			"pluginList": "fPqjPW_pluginList",
			"pluginEntryHead": "fPqjPW_pluginEntryHead",
			"pluginEntryActions": "fPqjPW_pluginEntryActions",
			"pluginEntry": "fPqjPW_pluginEntry",
			"switchThumb": "fPqjPW_switchThumb",
			"rowText": "fPqjPW_rowText",
			"pluginTopicBtn": "fPqjPW_pluginTopicBtn",
			"pluginCopyBtn": "fPqjPW_pluginCopyBtn",
			"cardTop": "fPqjPW_cardTop",
			"desc": "fPqjPW_desc",
			"cardMain": "fPqjPW_cardMain",
			"popupRows": "fPqjPW_popupRows",
			"suffix": "fPqjPW_suffix",
			"typedInput": "fPqjPW_typedInput",
			"switch": "fPqjPW_switch",
			"error": "fPqjPW_error",
			"pluginEmpty": "fPqjPW_pluginEmpty",
			"pluginDesc": "fPqjPW_pluginDesc",
			"groupHeading": "fPqjPW_groupHeading",
			"popupRow": "fPqjPW_popupRow",
			"done": "fPqjPW_done",
			"cardIconChip": "fPqjPW_cardIconChip",
			"pluginInstall": "fPqjPW_pluginInstall",
			"pluginEntries": "fPqjPW_pluginEntries",
			"row": "fPqjPW_row",
			"typedInputNumber": "fPqjPW_typedInputNumber",
			"section": "fPqjPW_section",
			"switchTrack": "fPqjPW_switchTrack",
			"popupDialog": "fPqjPW_popupDialog",
			"addCard": "fPqjPW_addCard",
			"card": "fPqjPW_card",
			"cardTitle": "fPqjPW_cardTitle",
			"group": "fPqjPW_group",
			"cardGear": "fPqjPW_cardGear",
			"switchInput": "fPqjPW_switchInput",
			"rowGear": "fPqjPW_rowGear",
			"title": "fPqjPW_title",
			"cardCheck": "fPqjPW_cardCheck",
			"cardDesc": "fPqjPW_cardDesc",
			"pluginJumpBtn": "fPqjPW_pluginJumpBtn",
			"pluginName": "fPqjPW_pluginName",
			"pluginModal": "fPqjPW_pluginModal",
			"count": "fPqjPW_count",
			"control": "fPqjPW_control"
		};
		//#endregion
		//#region src/client/add-plugin-modal.tsx
		/**
		* The "add plugin" modals (Side card settings → the dashed cards at the
		* end of the 侧边栏内容 / 文件预览 grids): declare that the sidebar's
		* extension points — tab pages and file previewers — are open to plugins
		* (registered through `ctx.betterSidebar`), point at the GitHub topic page
		* for discovery, and show the repo's recommended plugin catalog of the
		* matching kind (name / url / description / install script).
		*
		* Per entry there are two actions:
		* - 「跳转」opens the plugin's repo in a REAL new browser tab (window.open
		*   — a button, so the sidebar link takeover cannot reroute it);
		* - 「安装」only COPIES the install script to the clipboard (writeClipboard)
		*   with a transient "已复制" feedback on the button — the user pastes and
		*   runs it wherever they manage their DSH profile. No terminal is opened,
		*   nothing is closed, nothing can fail outward.
		*
		* The body is extracted as {@link PluginListBody} so tests render it
		* directly — the Modal primitive runs hooks unconditionally, so an open
		* Modal must never be renderToString'd (same rule as the settingsFor popup
		* in SideCardSection); the modal itself mounts only while open.
		*/
		init_locales();
		/** The catalog of one kind (kept in two repo files: plugins-tabs.ts /
		*  plugins-viewers.ts). */
		function catalogOf(kind) {
			return kind === "tab" ? builtinTabPlugins : builtinViewerPlugins;
		}
		/** How long the "已复制" feedback stays on the copy button. */
		const COPIED_FEEDBACK_MS = 1500;
		/** The modal body: the GitHub topic button + the recommended plugin list
		*  with per-entry jump/copy buttons (extracted for direct testing). */
		function PluginListBody(props) {
			const { service, kind } = props;
			const [copiedId, setCopiedId] = (0, react.useState)(null);
			/** Copy the entry's install script to the clipboard and flash the button's
			*  "已复制" label for a moment. The feedback ONLY appears after a
			*  successful write — when the clipboard is unavailable or denied
			*  (writeClipboard resolves false) nothing is shown, so the user is never
			*  told to paste a command that was not placed on the clipboard. Never
			*  closes anything, never throws outward. */
			const copy = async (entry) => {
				if (!await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(entry.install)) return;
				setCopiedId(entry.id);
				window.setTimeout(() => {
					setCopiedId((current) => current === entry.id ? null : current);
				}, COPIED_FEEDBACK_MS);
			};
			/** Open the plugin's repo in a REAL new browser tab (window.open — a
			*  button, so the sidebar link takeover cannot reroute it). */
			const jump = (entry) => {
				window.open(entry.url, "_blank", "noopener");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.pluginList,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SideCardSection_module_css_default.pluginTopicBtn,
						onClick: () => {
							window.open(PLUGIN_TOPIC_URL, "_blank", "noopener");
						},
						children: t("addPluginsBrowseMore")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.groupHeading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("addPluginsRecommended") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.count,
							children: catalogOf(kind).length
						})]
					}),
					catalogOf(kind).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.pluginEmpty,
						children: t("addPluginsEmpty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.pluginEntries,
						children: catalogOf(kind).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.pluginEntry,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: SideCardSection_module_css_default.pluginEntryHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SideCardSection_module_css_default.pluginName,
										"aria-label": `${t("openPlugin")}: ${entry.name}`,
										onClick: () => {
											jump(entry);
										},
										children: entry.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: SideCardSection_module_css_default.pluginEntryActions,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SideCardSection_module_css_default.pluginJumpBtn,
											"aria-label": `${t("openPlugin")}: ${entry.name}`,
											onClick: () => {
												jump(entry);
											},
											children: t("openPlugin")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SideCardSection_module_css_default.pluginCopyBtn,
											"aria-label": `${t("copyInstall")}: ${entry.name}`,
											onClick: () => {
												copy(entry);
											},
											children: copiedId === entry.id ? t("copied") : t("copy")
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SideCardSection_module_css_default.pluginDesc,
									children: typeof entry.description === "function" ? entry.description() : entry.description
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
									className: SideCardSection_module_css_default.pluginInstall,
									children: entry.install
								})
							]
						}, entry.id))
					})
				]
			});
		}
		/** The modal itself (mounted only while open — see the module comment). */
		function AddPluginModal(props) {
			const { service, onClose, kind } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: kind === "tab" ? t("addPluginsTabCard") : t("addPluginsViewerCard"),
				description: kind === "tab" ? t("addPluginsTabDesc") : t("addPluginsViewerDesc"),
				closeLabel: t("close"),
				className: SideCardSection_module_css_default.pluginModal,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: SideCardSection_module_css_default.done,
					onClick: onClose,
					children: t("settingsDone")
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginListBody, {
					service,
					kind
				})
			});
		}
		//#endregion
		//#region src/client/SideCardSection.tsx
		/**
		* "Side card" settings section: the user-facing preferences for the sidebar
		* panel, rendered natively in the DSH Settings shell (nav label "Side card").
		*
		* The section is DECLARATIVE — it renders the enable/disable inventory from
		* the sidebar service's registries instead of hardcoding rows:
		*  - 常规: new conversations open the panel by default (a toggle row), the
		*    default panel width as a percent of the window (number input row), and
		*    the open-path interception toggle — the DSH settings-row recipe
		*    (title/desc left + control right, hairline separators).
		*  - 侧边栏内容: one SMALL CARD per REGISTERED tab type (built-ins and
		*    external plugins alike), laid out in a responsive grid that wraps
		*    several cards per row — icon chip + title + type id, clicked to toggle
		*    the switch persisted in `prefs.tabsEnabled[id]`.
		*  - 文件预览: one SMALL CARD per REGISTERED file viewer — icon chip + title
		*    + the extensions it covers, clicked to toggle `prefs.viewersEnabled[id]`.
		*
		* Every group lives in a container card (the DSH PluginCard recipe: l2
		* hairline, 16px radius, layer-3 fill) with a heading and an inventory count
		* badge (the settings catalogHeading recipe); the section opens with a
		* one-line intro (the DSH section heading+intro recipe).
		*
		* A card's on/off state is its VISUAL STATE: enabled = highlighted (brand
		* border + tinted fill + a circular check badge pinned to the card's far
		* right), disabled = neutral and dimmed. Features that declare
		* `settings.toggles` carry a gear corner button that opens a native Modal
		* (wider than the primitive default) with the related settings as
		* title/desc + custom-switch rows and a Done footer. The toggles
		* themselves are custom switches: a real checkbox (native semantics and
		* focus) driving a styled track/thumb.
		*
		* Writes ride the plugin's own fenced settings route (the host calls the
		* settings seam in-process — the DSH settings RPC domain does not serve
		* third-party namespaces to configuration clients); the shared SidebarStore
		* is refreshed on success so the very next brand-new session seeds from the
		* new values and the sidebar's consumption points (the + menu, derived
		* flows) re-render immediately. Any failure reverts the optimistic UI and
		* shows the wire error inline — a broken settings surface never crashes the
		* shell.
		*/
		init_clsx();
		init_prefs_shared();
		init_locales();
		/** Map one wire failure to the inline message (the conflict gets friendly copy). */
		function messageOf(error) {
			if (error instanceof Error && "code" in error && error.code === "settings-conflict") return `${t("settingsSaveFailed")} ${t("settingsConflict")}`;
			return `${t("settingsSaveFailed")} ${error instanceof Error ? error.message : String(error)}`;
		}
		/** Resolve an i18n-friendly string-or-function value. */
		function textOf(value) {
			if (value === void 0) return "";
			return typeof value === "function" ? value() : value;
		}
		/** Resolve a descriptor icon (ReactNode or size function). */
		function iconOf(icon, size) {
			if (icon === void 0) return null;
			return typeof icon === "function" ? icon(size) : icon;
		}
		/** Tab inventory order: hidden types (editor/diff) last, then + menu order. */
		function tabOrder(a, b) {
			if (a.hidden !== b.hidden) return a.hidden === true ? 1 : -1;
			return (a.order ?? 100) - (b.order ?? 100);
		}
		/** Viewer inventory order: priority desc (the catch-all `code` comes last). */
		function viewerOrder(a, b) {
			return (b.priority ?? 0) - (a.priority ?? 0);
		}
		/** Whether a feature declares any secondary settings (gear button shows). */
		function hasSettings(feature) {
			const settings = feature.settings;
			return settings !== void 0 && ((settings.toggles?.length ?? 0) > 0 || (settings.pluginToggles?.length ?? 0) > 0 || settings.render !== void 0);
		}
		/** A feature's display name (viewers fall back to their id). */
		function featureNameOf(feature) {
			return textOf("title" in feature ? feature.title : void 0) || feature.id;
		}
		/**
		* Merge one plugin-owned setting into a pluginSettings map (pure, v0.12.0+).
		* Sequential merges are additive: each call spreads the map it was GIVEN,
		* so building from the latest optimistic map keeps earlier keys intact
		* (two same-tick writes must not drop each other).
		*/
		function mergePluginSetting(pluginSettings, descriptorId, key, value) {
			return {
				...pluginSettings,
				[descriptorId]: {
					...pluginSettings[descriptorId] ?? {},
					[key]: value
				}
			};
		}
		/**
		* Render a custom settings panel (`settings.render`) with error containment:
		* a throwing panel shows an inline error line instead of breaking the whole
		* settings page.
		*/
		function SettingsRender(props) {
			let content;
			try {
				content = props.render(props.renderProps);
			} catch (error) {
				content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SideCardSection_module_css_default.error,
					role: "alert",
					children: [
						t("settingsSaveFailed"),
						" ",
						error instanceof Error ? error.message : String(error)
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: content });
		}
		/**
		* The custom switch: a real checkbox (hidden, native semantics and focus)
		* driving a styled track/thumb. Used by the general toggle rows and the
		* secondary settings popup rows.
		*/
		function Switch(props) {
			const { checked, onChange, label } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: SideCardSection_module_css_default.switch,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: SideCardSection_module_css_default.switchInput,
					checked,
					"aria-label": label,
					onChange: (event) => {
						onChange(event.currentTarget.checked);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SideCardSection_module_css_default.switchTrack,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SideCardSection_module_css_default.switchThumb })
				})]
			});
		}
		/**
		* The body of a feature's secondary settings popup: one row (title/desc +
		* control) per declared setting. Switches render the custom switch; text and
		* number rows render a free-form / numeric input committed on blur/Enter
		* (clamped to the declared min/max). Extracted so the rows are testable
		* without opening the Modal (the Modal portal renders only while open).
		*/
		function FeatureSettingsRows(props) {
			const { toggles, prefs, onToggle, onCommit, valueSource } = props;
			const read = valueSource ?? ((key) => prefs[key]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SideCardSection_module_css_default.popupRows,
				children: toggles.map((toggle) => {
					const title = textOf(toggle.title);
					if ((toggle.type ?? "switch") === "switch") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.popupRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.rowText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.title,
								children: title
							}), textOf(toggle.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.desc,
								children: textOf(toggle.desc)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
							label: title,
							checked: read(toggle.key) === true,
							onChange: (next) => {
								onToggle(toggle, next);
							}
						})]
					}, toggle.key);
					const value = String(read(toggle.key) ?? "");
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypedRow, {
						toggle,
						title,
						value,
						onCommit
					}, `${toggle.key}:${value}`);
				})
			});
		}
		/**
		* One text/number row: a controlled input whose draft is local state,
		* committed on blur/Enter through the parent's onCommit. The parent's
		* canonical return is adopted (clamped numbers, stored value for invalid
		* input); a `unit` suffix renders after the input (e.g. 'px').
		*/
		function TypedRow(props) {
			const { toggle, title, value, onCommit } = props;
			const [draft, setDraft] = (0, react.useState)(value);
			const commit = () => {
				const canonical = onCommit?.(toggle, draft) ?? draft;
				setDraft(canonical);
			};
			const number = toggle.type === "number";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SideCardSection_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.title,
						children: title
					}), textOf(toggle.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.desc,
						children: textOf(toggle.desc)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SideCardSection_module_css_default.control,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						type: number ? "number" : "text",
						className: number ? SideCardSection_module_css_default.typedInputNumber : SideCardSection_module_css_default.typedInput,
						value: draft,
						min: toggle.min,
						max: toggle.max,
						step: 1,
						placeholder: toggle.placeholder,
						"aria-label": title,
						onChange: (event) => {
							setDraft(event.currentTarget.value);
						},
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") event.currentTarget.blur();
						}
					}), toggle.unit !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.suffix,
						children: toggle.unit
					})]
				})]
			});
		}
		/**
		* The secondary settings popup body of one feature (tab or viewer):
		* - `settings.render` (custom panel) when declared — rendered with the
		*   shared store/service, the live prefs, the descriptor's own plugin
		*   settings blob, a persistence helper, and a close callback;
		* - otherwise the host-prefs `toggles` rows, then the plugin-owned
		*   `pluginToggles` rows (their values live in `pluginSettings[feature.id]`,
		*   projected onto the prefs face so the shared row renderer reads them).
		*/
		function SettingsBody(props) {
			const { feature, prefs, store, service, onToggle, onCommit, onPluginToggle, onPluginCommit, onPluginWrite, onClose } = props;
			const render = feature.settings?.render;
			if (render !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsRender, {
				render,
				renderProps: {
					store,
					service,
					prefs,
					pluginSettings: prefs.pluginSettings[feature.id] ?? {},
					updatePluginSetting: onPluginWrite,
					close: onClose
				}
			});
			const toggles = feature.settings?.toggles ?? [];
			const pluginToggles = feature.settings?.pluginToggles ?? [];
			if (toggles.length === 0 && pluginToggles.length === 0) return null;
			const pluginBlob = prefs.pluginSettings[feature.id] ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRows,
				children: [toggles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
					toggles,
					prefs,
					onToggle,
					onCommit
				}), pluginToggles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
					toggles: pluginToggles,
					prefs,
					onToggle: onPluginToggle,
					onCommit: onPluginCommit,
					valueSource: (key) => pluginBlob[key]
				})]
			});
		}
		/**
		* Render the Side card preferences section.
		* @param props - composed slot props (runtime share + injected store/service).
		* @returns the section element tree.
		*/
		function SideCardSection({ store, service }) {
			const [prefs, setPrefs] = (0, react.useState)(() => store.getPrefs());
			const [widthDraft, setWidthDraft] = (0, react.useState)(String(store.getPrefs().defaultWidthPercent));
			const [centerMaxDraft, setCenterMaxDraft] = (0, react.useState)(String(store.getPrefs().centerTabMax));
			const [reviewSessionsDraft, setReviewSessionsDraft] = (0, react.useState)(String(store.getPrefs().reviewDoneSessionLimit));
			const [error, setError] = (0, react.useState)(null);
			const [settingsFor, setSettingsFor] = (0, react.useState)(null);
			const [stripSettingsOpen, setStripSettingsOpen] = (0, react.useState)(false);
			const [addPluginsOpen, setAddPluginsOpen] = (0, react.useState)(null);
			const optimisticRef = (0, react.useRef)(prefs);
			(0, react.useEffect)(() => {
				optimisticRef.current = prefs;
			}, [prefs]);
			const [tabs, setTabs] = (0, react.useState)(() => [...service.getTabs()].sort(tabOrder));
			const [viewers, setViewers] = (0, react.useState)(() => [...service.getFileViewers()].sort(viewerOrder));
			(0, react.useEffect)(() => service.subscribe(() => {
				setTabs([...service.getTabs()].sort(tabOrder));
				setViewers([...service.getFileViewers()].sort(viewerOrder));
			}), [service]);
			const revisionRef = (0, react.useRef)(void 0);
			const dirtyRef = (0, react.useRef)(false);
			const inFlightRef = (0, react.useRef)(Promise.resolve());
			(0, react.useEffect)(() => {
				let cancelled = false;
				api.settingsGet().then((view) => {
					if (cancelled) return;
					revisionRef.current = view.revision;
					if (dirtyRef.current) return;
					const next = parsePrefs(view.value);
					setPrefs(next);
					setWidthDraft(String(next.defaultWidthPercent));
					setCenterMaxDraft(String(next.centerTabMax));
					setReviewSessionsDraft(String(next.reviewDoneSessionLimit));
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, []);
			/** Persist one patch through the settings route (serialized, revision-guarded). */
			const commit = (patch) => {
				dirtyRef.current = true;
				const run = inFlightRef.current.then(async () => {
					const view = await api.settingsUpdate({ ...patch }, revisionRef.current);
					const next = parsePrefs(view.value);
					revisionRef.current = view.revision;
					store.setPrefs(next);
					return next;
				});
				inFlightRef.current = run.then(() => void 0, () => void 0);
				return run.then((next) => ({
					ok: true,
					prefs: next
				}), (caught) => {
					setError(messageOf(caught));
					return {
						ok: false,
						prefs
					};
				});
			};
			/** Settle one commit: success adopts the server values, failure reverts. */
			const applyOutcome = (previous, outcome) => {
				const settled = outcome.ok ? outcome.prefs : previous;
				setPrefs(settled);
				setWidthDraft(String(settled.defaultWidthPercent));
				setCenterMaxDraft(String(settled.centerTabMax));
				setReviewSessionsDraft(String(settled.reviewDoneSessionLimit));
			};
			/** Optimistically apply one pref patch, then commit (revert on failure). */
			const applyPref = (patch) => {
				const previous = optimisticRef.current;
				const next = {
					...previous,
					...patch
				};
				optimisticRef.current = next;
				setPrefs(next);
				setError(null);
				commit(patch).then((outcome) => applyOutcome(previous, outcome));
			};
			const onToggle = (next) => {
				applyPref({ openByDefault: next });
			};
			/** Flip one per-tab enable switch (merge into the tabsEnabled map). */
			const onToggleTab = (id, next) => {
				applyPref({ tabsEnabled: {
					...optimisticRef.current.tabsEnabled,
					[id]: next
				} });
			};
			/** Flip one per-viewer enable switch (merge into the viewersEnabled map). */
			const onToggleViewer = (id, next) => {
				applyPref({ viewersEnabled: {
					...optimisticRef.current.viewersEnabled,
					[id]: next
				} });
			};
			/** Flip one declaratively-declared toggle (a SidebarPrefs boolean field). */
			const onToggleSetting = (toggle, next) => {
				applyPref({ [toggle.key]: next });
			};
			/**
			* Commit one declaratively-declared text/number row. Numbers are parsed
			* and clamped to the toggle's declared min/max (an unparsable input falls
			* back to the CURRENT stored value, mirroring the width row); text rows
			* persist as-is (empty is meaningful, e.g. the theme-default font).
			* Returns the canonical value the row should display.
			*/
			const onCommitSetting = (toggle, raw) => {
				if (toggle.type === "number") {
					const parsed = Number(raw);
					const fallback = String(prefs[toggle.key] ?? "");
					if (!Number.isFinite(parsed)) return fallback;
					let clamped = Math.round(parsed);
					if (toggle.min !== void 0) clamped = Math.max(toggle.min, clamped);
					if (toggle.max !== void 0) clamped = Math.min(toggle.max, clamped);
					applyPref({ [toggle.key]: clamped });
					return String(clamped);
				}
				applyPref({ [toggle.key]: raw });
				return raw;
			};
			/** Persist one plugin-owned setting of one descriptor (merged into the pluginSettings blob). */
			const applyPluginSetting = (descriptorId, key, value) => {
				applyPref({ pluginSettings: mergePluginSetting(optimisticRef.current.pluginSettings, descriptorId, key, value) });
			};
			/** Flip one plugin-owned switch row (same row shape, plugin-scoped key). */
			const onPluginToggle = (descriptorId, toggle, next) => {
				applyPluginSetting(descriptorId, toggle.key, next);
			};
			/** Commit one plugin-owned text/number row (clamped like the host rows). */
			const onPluginCommitSetting = (descriptorId, toggle, raw) => {
				if (toggle.type === "number") {
					const parsed = Number(raw);
					const blob = prefs.pluginSettings[descriptorId] ?? {};
					const fallback = String(blob[toggle.key] ?? "");
					if (!Number.isFinite(parsed)) return fallback;
					let clamped = Math.round(parsed);
					if (toggle.min !== void 0) clamped = Math.max(toggle.min, clamped);
					if (toggle.max !== void 0) clamped = Math.min(toggle.max, clamped);
					applyPluginSetting(descriptorId, toggle.key, clamped);
					return String(clamped);
				}
				applyPluginSetting(descriptorId, toggle.key, raw);
				return raw;
			};
			const commitWidth = () => {
				const parsed = Number(widthDraft);
				if (!Number.isFinite(parsed)) {
					setWidthDraft(String(prefs.defaultWidthPercent));
					return;
				}
				const clamped = clampWidthPercent(parsed);
				const previous = prefs;
				setPrefs({
					...previous,
					defaultWidthPercent: clamped
				});
				setWidthDraft(String(clamped));
				setError(null);
				commit({ defaultWidthPercent: clamped }).then((outcome) => applyOutcome(previous, outcome));
			};
			const commitCenterMax = () => {
				const parsed = Number(centerMaxDraft);
				if (!Number.isFinite(parsed)) {
					setCenterMaxDraft(String(prefs.centerTabMax));
					return;
				}
				const clamped = clampCenterTabMax(parsed);
				const previous = prefs;
				setPrefs({
					...previous,
					centerTabMax: clamped
				});
				setCenterMaxDraft(String(clamped));
				setError(null);
				commit({ centerTabMax: clamped }).then((outcome) => applyOutcome(previous, outcome));
			};
			const commitReviewSessions = () => {
				const parsed = Number(reviewSessionsDraft);
				if (!Number.isFinite(parsed)) {
					setReviewSessionsDraft(String(prefs.reviewDoneSessionLimit));
					return;
				}
				const clamped = clampReviewDoneSessions(parsed);
				const previous = prefs;
				setPrefs({
					...previous,
					reviewDoneSessionLimit: clamped
				});
				store.setPrefs({
					...previous,
					reviewDoneSessionLimit: clamped
				});
				setReviewSessionsDraft(String(clamped));
				setError(null);
				commit({ reviewDoneSessionLimit: clamped }).then((outcome) => applyOutcome(previous, outcome));
			};
			/**
			* One SMALL toggle card for the responsive inventory grid: the card's main
			* area is the switch (click to flips, visual state IS the state), the icon
			* sits in a rounded chip, the check badge pins to the far right, and a
			* feature that declares related settings carries a gear corner button
			* opening its settings popup.
			*/
			const renderCard = (props) => {
				const hasSettings = props.onOpenSettings !== void 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(SideCardSection_module_css_default.card, props.enabled && SideCardSection_module_css_default.cardOn, hasSettings && SideCardSection_module_css_default.cardWithGear),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SideCardSection_module_css_default.cardMain,
						"aria-pressed": props.enabled,
						title: props.desc,
						onClick: () => {
							props.onToggle(!props.enabled);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.cardTop,
							children: [
								props.icon !== null && props.icon !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardIconChip,
									children: props.icon
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardTitle,
									children: props.title
								}),
								props.enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardCheck,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 12 })
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.cardDesc,
							children: props.desc
						})]
					}), hasSettings && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SideCardSection_module_css_default.cardGear,
						"aria-label": `${props.title} ${t("settingsPopup")}`,
						title: t("settingsPopup"),
						onClick: props.onOpenSettings,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 12 })
					})]
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SideCardSection_module_css_default.intro,
						children: t("settingsIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SideCardSection_module_css_default.groupHeading,
								children: t("settingsGeneralTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsOpenTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsOpenDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
									label: t("settingsOpenTitle"),
									checked: prefs.openByDefault,
									onChange: onToggle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsWidthTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsWidthDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.control,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										type: "number",
										className: SideCardSection_module_css_default.percentInput,
										value: widthDraft,
										min: 20,
										max: 60,
										step: 1,
										"aria-label": t("settingsWidthTitle"),
										onChange: (event) => {
											setWidthDraft(event.currentTarget.value);
										},
										onBlur: commitWidth,
										onKeyDown: (event) => {
											if (event.key === "Enter") event.currentTarget.blur();
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.suffix,
										children: t("settingsWidthSuffix")
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsOpenPathTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsOpenPathDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
									label: t("settingsOpenPathTitle"),
									checked: prefs.interceptOpenPath,
									onChange: (next) => {
										applyPref({ interceptOpenPath: next });
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsTitleBarTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsTitleBarDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.control,
									children: [prefs.titleBarCompat && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SideCardSection_module_css_default.rowGear,
										"aria-label": `${t("settingsTitleBarTitle")} ${t("settingsPopup")}`,
										title: t("settingsPopup"),
										onClick: () => {
											setStripSettingsOpen(true);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 14 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
										label: t("settingsTitleBarTitle"),
										checked: prefs.titleBarCompat,
										onChange: (next) => {
											applyPref({ titleBarCompat: next });
										}
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsCenterTabsTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsCenterTabsDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
									label: t("settingsCenterTabsWrap"),
									checked: prefs.centerTabOverflow === "wrap",
									onChange: (next) => {
										applyPref({ centerTabOverflow: next ? "wrap" : "scroll" });
									}
								})]
							}),
							prefs.centerTabOverflow === "wrap" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsCenterTabMaxTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsCenterTabMaxDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.control,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										type: "number",
										className: SideCardSection_module_css_default.percentInput,
										value: centerMaxDraft,
										min: 1,
										max: 100,
										step: 1,
										"aria-label": t("settingsCenterTabMaxTitle"),
										onChange: (event) => {
											setCenterMaxDraft(event.currentTarget.value);
										},
										onBlur: commitCenterMax,
										onKeyDown: (event) => {
											if (event.key === "Enter") event.currentTarget.blur();
										}
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("reviewDoneSessionsTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("reviewDoneSessionsDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.control,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										type: "number",
										className: SideCardSection_module_css_default.percentInput,
										value: reviewSessionsDraft,
										min: 1,
										max: 50,
										step: 1,
										"aria-label": t("reviewDoneSessionsTitle"),
										onChange: (event) => {
											setReviewSessionsDraft(event.currentTarget.value);
										},
										onBlur: commitReviewSessions,
										onKeyDown: (event) => {
											if (event.key === "Enter") event.currentTarget.blur();
										}
									})
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.groupHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settingsTabsTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.count,
								children: tabs.length
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.grid,
							children: [tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderCard({
								title: textOf(tab.title),
								desc: tab.id,
								icon: iconOf(tab.icon, 16),
								enabled: prefs.tabsEnabled[tab.id] !== false,
								onToggle: (next) => {
									onToggleTab(tab.id, next);
								},
								onOpenSettings: prefs.tabsEnabled[tab.id] !== false && hasSettings(tab) ? () => {
									setSettingsFor(tab);
								} : void 0
							}) }, tab.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: clsx(SideCardSection_module_css_default.card, SideCardSection_module_css_default.addCard),
								onClick: () => {
									setAddPluginsOpen("tab");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.cardTop,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardIconChip,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardTitle,
										children: t("addPluginsTabCard")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardDesc,
									children: t("addPluginsTabCardDesc")
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.groupHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settingsViewersTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.count,
								children: viewers.length
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.grid,
							children: [viewers.map((viewer) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderCard({
								title: textOf(viewer.title) || viewer.id,
								desc: viewer.exts.length === 0 ? t("settingsViewerCatchAll") : viewer.exts.join(" · "),
								icon: iconOf(viewer.icon, 16),
								enabled: prefs.viewersEnabled[viewer.id] !== false,
								onToggle: (next) => {
									onToggleViewer(viewer.id, next);
								},
								onOpenSettings: prefs.viewersEnabled[viewer.id] !== false && hasSettings(viewer) ? () => {
									setSettingsFor(viewer);
								} : void 0
							}) }, viewer.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: clsx(SideCardSection_module_css_default.card, SideCardSection_module_css_default.addCard),
								onClick: () => {
									setAddPluginsOpen("viewer");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.cardTop,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardIconChip,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardTitle,
										children: t("addPluginsViewerCard")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardDesc,
									children: t("addPluginsViewerCardDesc")
								})]
							})]
						})]
					}),
					settingsFor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setSettingsFor(null);
						},
						title: featureNameOf(settingsFor),
						description: t("settingsPopupDesc", { feature: featureNameOf(settingsFor) }),
						closeLabel: t("close"),
						className: SideCardSection_module_css_default.popupDialog,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SideCardSection_module_css_default.done,
							onClick: () => {
								setSettingsFor(null);
							},
							children: t("settingsDone")
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsBody, {
							feature: settingsFor,
							prefs,
							onToggle: onToggleSetting,
							onCommit: onCommitSetting,
							onPluginToggle: (toggle, next) => {
								onPluginToggle(settingsFor.id, toggle, next);
							},
							onPluginCommit: (toggle, raw) => onPluginCommitSetting(settingsFor.id, toggle, raw),
							onPluginWrite: (key, value) => {
								applyPluginSetting(settingsFor.id, key, value);
							},
							onClose: () => {
								setSettingsFor(null);
							},
							store,
							service
						})
					}),
					stripSettingsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setStripSettingsOpen(false);
						},
						title: t("settingsTitleBarTitle"),
						description: t("settingsPopupDesc", { feature: t("settingsTitleBarTitle") }),
						closeLabel: t("close"),
						className: SideCardSection_module_css_default.popupDialog,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SideCardSection_module_css_default.done,
							onClick: () => {
								setStripSettingsOpen(false);
							},
							children: t("settingsDone")
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
							toggles: [{
								key: "titleBarStripPx",
								type: "number",
								title: () => t("settingsTitleBarStripTitle"),
								desc: () => t("settingsTitleBarStripDesc"),
								min: 0,
								max: 120,
								unit: "px"
							}],
							prefs,
							onToggle: onToggleSetting,
							onCommit: onCommitSetting
						})
					}),
					addPluginsOpen !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddPluginModal, {
						service,
						onClose: () => {
							setAddPluginsOpen(null);
						},
						kind: addPluginsOpen
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.error,
						role: "alert",
						children: error
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/laiweibin/work/workSoftware/dhs-plugins/dsh-better-sidebar/src/client/layout.css.mjs
		const css = "/**\n * Layout push: when a panel is open it OCCUPIES the layout instead of\n * floating over it — the app shell (#root, the AppFrame three-column grid)\n * gives up space. Only the center column is flexible (1fr), so the right\n * panel's width squeeze (margin-right on #root) lands exactly on the\n * conversation output and the input bar, like a VSCode sidebar.\n *\n * The bottom panel squeezes ONLY the center column — it must not cover the\n * app's own left sidebar or the right panel. DSH 0.1.x wraps slot hosts in\n * [data-slot] containers, so the AppFrame grid lives one level deeper:\n * #root > div[data-slot=\"root\"] > div (the frame). Its grid items are\n * (frame > div:nth-child(1..3)): sidebarCol, centerCol, detailsCol, so the\n * vertical push lands on the center column alone. The fixed panels cover\n * the vacated strips, which looks seamless because #root's background is\n * the theme base.\n *\n * The sizes ride CSS variables updated by the Sidebar shell (0 while\n * collapsed); expand/collapse animates both the margins and the panel\n * slides on the same theme duration. Drags disable the transition so the\n * layout tracks the pointer.\n */\n#root {\n  margin-right: var(--dsh-sidebar-width, 0px);\n  transition: margin-right var(--ds-transition-duration-slow) var(--ds-ease-in-out);\n}\n\n/* The AppFrame's grid items are sidebarCol, centerCol, detailsCol (children\n   1-3 of #root > div[data-slot=\"root\"] > div) — nth-child(2) is the center\n   column. A stretched grid item shrinks by its margins, so the conversation\n   content (output + input bar) lifts without touching the sidebars. */\n#root > div[data-slot=\"root\"] > div > div:nth-child(2) {\n  margin-bottom: var(--dsh-sidebar-height, 0px);\n  transition: margin-bottom var(--ds-transition-duration-slow) var(--ds-ease-in-out);\n}\n\n/* When the sidebar is collapsed, the toggle cluster reclaims the top-right\n   corner. Push the DSH session header's right padding out so its right-aligned\n   utilities (the \"Session log\" download capsule) yield the corner instead of\n   hiding under the cluster. The header default right-pads 28px; the 2-button\n   cluster spans right 10→70px, so 78px clears it with an 8px gap. Anchor on\n   the header's slot host wrapper ([data-slot=\"conversation.session.header\"])\n   rather than a positional path: DSH 0.1.x nests the header several levels\n   under the center column. The Sidebar shell toggles the body attribute with\n   the panel open state. */\nbody[data-dsh-sidebar-collapsed] [data-slot=\"conversation.session.header\"] > header {\n  padding-right: 78px;\n}\n\n/* Keep 对话 / 轨迹 in the host tablist (never steal React nodes).\n   Spacing lives inside each tab's padding so a sticky pin has no\n   gap for file-tab glyphs to show through. One hairline only: the\n   host header ::after — we do not paint a second divider. */\n[data-slot=\"conversation.session.header\"] [role=\"tablist\"] {\n  position: relative;\n  isolation: isolate;\n  flex-wrap: nowrap;\n  align-items: stretch;\n  gap: 0;\n  min-width: 0;\n  overflow-x: auto;\n  overflow-y: hidden;\n  scrollbar-width: none;\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tablist\"]::-webkit-scrollbar {\n  display: none;\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tablist\"] > [role=\"tab\"] {\n  flex: none !important;\n  flex-shrink: 0 !important;\n  white-space: nowrap !important;\n  padding-left: 10px;\n  padding-right: 10px;\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tablist\"] > [role=\"tab\"][data-dsh-center-pin] {\n  position: sticky;\n  z-index: 4;\n  align-self: stretch;\n  box-sizing: border-box;\n  background: var(--dsh-pin-fill, var(--dsw-alias-bg-layer-1));\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tablist\"] > [role=\"tab\"][data-dsh-center-pin]:first-of-type {\n  padding-left: 8px;\n  box-shadow: -32px 0 0 8px var(--dsh-pin-fill, var(--dsw-alias-bg-layer-1));\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tab\"]:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-slot=\"conversation.session.header\"] [role=\"tab\"][data-dsh-center-pin]:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\nbody[data-dsh-center-tabs-wrap] [data-slot=\"conversation.session.header\"] [role=\"tablist\"] {\n  flex-wrap: wrap;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: visible;\n  row-gap: 6px;\n}\n\nbody[data-dsh-center-tabs-wrap] [data-slot=\"conversation.session.header\"] [role=\"tablist\"] > [role=\"tab\"][data-dsh-center-pin] {\n  position: static;\n  left: auto !important;\n}\n\nbody[data-dsh-center-tabs-wrap] [data-slot=\"conversation.session.header\"] > header {\n  height: auto;\n  min-height: 48px;\n  overflow: visible;\n  align-items: flex-start;\n}\n\nbody[data-dsh-sidebar-dragging] #root,\nbody[data-dsh-sidebar-dragging] #root > div[data-slot=\"root\"] > div > div:nth-child(2) {\n  transition: none;\n}\n\n/* DSH 0.1.x gives external settings sections a generic gear and exposes no\n   icon field in the settings.section contract. settings-nav-icon.ts marks\n   only this plugin's localized row; render the requested Lucide\n   gallery-horizontal-end SVG as a currentColor mask so it follows the native\n   nav hover/active colors without changing the shell's 16px icon rhythm. */\n[data-dsh-better-sidebar-settings-nav] > svg:first-child {\n  display: none;\n}\n\n[data-dsh-better-sidebar-settings-nav]::before {\n  content: '';\n  flex: none;\n  width: 16px;\n  height: 16px;\n  background: currentColor;\n  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 7v10'/%3E%3Cpath d='M6 5v14'/%3E%3Crect width='12' height='18' x='10' y='3' rx='2'/%3E%3C/svg%3E\") center / contain no-repeat;\n  mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 7v10'/%3E%3Cpath d='M6 5v14'/%3E%3Crect width='12' height='18' x='10' y='3' rx='2'/%3E%3C/svg%3E\") center / contain no-repeat;\n}\n\n/* File chips in the composer: the backdrop is pointer-events:none, but the\n   click interceptor still treats them as links — show the pointer.\n   Current DSH writes `@label` in-flow (one chip = the full token). Paint the\n   pill on the chip itself so layout width stays the draft text — extra\n   padding / scale(0.72) / max-content on the inner span made the last glyph\n   overflow the host backdrop (`overflow:hidden`) and look like a missing\n   character. */\n[data-composer-card] [data-decoration=\"chip\"] {\n  cursor: pointer;\n  background: #6187d838 !important;\n  border-radius: 6px;\n}\n\n[data-composer-card] [data-decoration=\"chip\"] > span {\n  overflow: visible !important;\n}\n\n[data-composer-card] [data-decoration=\"chip\"][data-invalid] {\n  background: #d8616133 !important;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  #root,\n  #root > div[data-slot=\"root\"] > div > div:nth-child(2) {\n    transition: none;\n  }\n}\n";
		const tagId = "dsh-external/dsh-better-sidebar/layout.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-external/dsh-better-sidebar";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Client half of dsh-better-sidebar: resolves the user's "Side card"
		* preferences through the plugin's own fenced settings route, mounts the
		* right sidebar portal (inside an error boundary so a rendering failure
		* shows an error strip instead of a blank panel), registers the turn-tail
		* interception, and contributes the Side card settings section to the DSH
		* Settings shell. Requires the runtime's slots and sessions services; the
		* bundle itself is a module-table consumer only (react + ui-primitives +
		* xterm, all provided or inlined).
		*/
		init_state();
		init_composer_chip_caret();
		init_conversation_views();
		init_locales();
		init_sidebar_module_css();
		/** Services required before mounting (provided by the client runtime; the
		*  locale service backs the sidebar's copy — see locales.ts). */
		const inject = [
			"slots",
			"sessions",
			"connection",
			"workspaces",
			"locale"
		];
		/**
		* Error boundary over the sidebar tree (root scope): a render error in the
		* sidebar SHELL itself must never blank the page silently — the shared
		* RenderBoundary shows a dismissible error strip and logs the stack. The
		* per-tab scope (Sidebar.tsx) catches viewer/editor crashes first; this root
		* boundary stays as the last resort for Workbench/shell errors.
		*/
		/**
		* Client plugin body.
		* @param ctx - the client cordis context (slots, sessions).
		*/
		function apply(ctx) {
			attachLocale(ctx.locale);
			ctx.effect(() => {
				const offZh = ctx.locale.register(LOCALE_NS, "zh", zh);
				const offEn = ctx.locale.register(LOCALE_NS, "en", en);
				return () => {
					offZh();
					offEn();
				};
			}, "dsh-better-sidebar: dictionaries");
			const sidebarStore = createSidebarStore();
			const service = createBetterSidebarService(sidebarStore);
			ctx.provide("betterSidebar", service);
			ctx.effect(() => registerBuiltins(ctx, service), "dsh-better-sidebar: register built-in tabs and viewers");
			const fail = (phase, error) => {
				console.error(`[dsh-better-sidebar] ${phase} error:`, error);
				try {
					const bar = document.createElement("div");
					bar.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483000;max-width:70vw;padding:8px 12px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#f2a1a1;background:#1b1b22;border:1px solid #f2a1a1;border-radius:8px;white-space:pre-wrap";
					bar.textContent = `[dsh-better-sidebar] ${phase} error: ${error instanceof Error ? error.message : String(error)}`;
					document.body.appendChild(bar);
				} catch {}
			};
			try {
				resetChunks();
				setChunkModuleSystem(ctx.get("modules"));
				ctx.effect(() => {
					let disposed = false;
					let root;
					let host;
					(async () => {
						const prefs = await Promise.race([loadPrefs(api), new Promise((resolve) => {
							window.setTimeout(() => resolve(null), 2e3);
						})]);
						if (prefs !== null) sidebarStore.setPrefs(prefs);
						if (disposed) return;
						try {
							host = document.createElement("div");
							host.setAttribute("data-dsh-better-sidebar", "");
							document.body.appendChild(host);
							root = (0, react_dom_client.createRoot)(host);
							root.render((0, react.createElement)(RenderBoundary, { className: sidebar_module_css_default.boundaryError }, (0, react.createElement)(Sidebar, {
								ctx,
								store: sidebarStore
							})));
						} catch (error) {
							fail("mount", error);
						}
					})();
					return () => {
						disposed = true;
						root?.unmount();
						host?.remove();
					};
				}, "dsh-better-sidebar: sidebar mount");
				ctx.effect(() => {
					try {
						return registerTurnTailInterception(ctx, sidebarStore);
					} catch (error) {
						fail("interception", error);
						return;
					}
				}, "dsh-better-sidebar: turn-tail interception");
				ctx.effect(() => {
					try {
						return registerOpenPathInterception(ctx, sidebarStore);
					} catch (error) {
						fail("interception", error);
						return;
					}
				}, "dsh-better-sidebar: open-path interception");
				ctx.effect(() => {
					try {
						const urlTargetOf = (url) => {
							const prefs = sidebarStore.getPrefs();
							return matchUrlTarget(service.getTabs().filter((tab) => prefs.tabsEnabled[tab.id] !== false), url)?.id;
						};
						return registerLinkInterception({
							takeoverEnabled: (url) => {
								const prefs = sidebarStore.getPrefs();
								if (prefs.browserInterceptLinks === false) return false;
								if (!(url.protocol === "https:" ? prefs.browserInterceptHttps !== false : prefs.browserInterceptHttp !== false)) return false;
								return urlTargetOf(url) !== void 0 || prefs.tabsEnabled["browser"] !== false;
							},
							openInSidebar: (url) => {
								let title;
								try {
									title = new URL(url).hostname;
								} catch {}
								const type = urlTargetOf(new URL(url)) ?? "browser";
								ctx.betterSidebar?.openTab({
									type,
									url,
									title
								});
							},
							selfOrigin: window.location.origin
						});
					} catch (error) {
						fail("interception", error);
						return;
					}
				}, "dsh-better-sidebar: link interception");
				ctx.effect(() => {
					try {
						return registerImeGuard();
					} catch (error) {
						fail("ime guard", error);
						return;
					}
				}, "dsh-better-sidebar: IME composition guard");
				ctx.effect(() => {
					try {
						return registerFileTriggerSource(ctx);
					} catch (error) {
						fail("file trigger", error);
						return;
					}
				}, "dsh-better-sidebar: file reference source");
				ctx.effect(() => {
					try {
						return registerComposerFileDrop(ctx);
					} catch (error) {
						fail("file drop", error);
						return;
					}
				}, "dsh-better-sidebar: composer file drop");
				ctx.effect(() => {
					try {
						return registerComposerChipCaret(ctx);
					} catch (error) {
						fail("chip caret", error);
						return;
					}
				}, "dsh-better-sidebar: composer chip caret");
				ctx.effect(() => {
					try {
						return registerComposerChipLayout(ctx);
					} catch (error) {
						fail("chip layout", error);
						return;
					}
				}, "dsh-better-sidebar: composer chip layout");
				ctx.effect(() => {
					try {
						return registerConversationViews(ctx, sidebarStore);
					} catch (error) {
						fail("conversation views", error);
						return;
					}
				}, "dsh-better-sidebar: conversation header views");
				ctx.effect(() => {
					try {
						return registerChatFileChips(ctx);
					} catch (error) {
						fail("chat file chips", error);
						return;
					}
				}, "dsh-better-sidebar: chat file chips");
				ctx.effect(() => registerSettingsNavIcon(() => t("settingsNav")), "dsh-better-sidebar: settings navigation icon");
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "better-sidebar",
					order: 100,
					label: () => t("settingsNav"),
					inject: () => ({
						store: sidebarStore,
						service
					})
				}, SideCardSection));
			} catch (error) {
				fail("load", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client-registry.js.map