/**
 * Markdown Editor - Complete Application Logic
 * Features: Undo/Redo, Search/Replace, KaTeX, Mermaid, Image Upload,
 * Editor Toolbar, Word Count, TOC, Theme Toggle, Print, PDF Export
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========================================
    // DOM Elements
    // ========================================
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const markdownContent = document.getElementById('markdownContent');
    const splitView = document.getElementById('splitView');
    const editorTextarea = document.getElementById('editorTextarea');
    const previewContent = document.getElementById('previewContent');
    const fileInfoBar = document.getElementById('fileInfoBar');
    const fileNameEl = document.getElementById('fileName');
    const fileStatusEl = document.getElementById('fileStatus');
    const fileStatsEl = document.getElementById('fileStats');
    const splitResizer = document.getElementById('splitResizer');

    // Toolbar buttons
    const newFileBtn = document.getElementById('newFileBtn');
    const openFileBtn = document.getElementById('openFileBtn');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const exportMdBtn = document.getElementById('exportMdBtn');
    const exportHtmlBtn = document.getElementById('exportHtmlBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // New toolbar buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const searchBtn = document.getElementById('searchBtn');
    const printBtn = document.getElementById('printBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const tocToggleBtn = document.getElementById('tocToggleBtn');
    const wordCountEl = document.getElementById('wordCount');
    const wordCountTextEl = document.getElementById('wordCountText');

    // Mode toggle
    const previewModeBtn = document.getElementById('previewModeBtn');
    const editModeBtn = document.getElementById('editModeBtn');

    // Search dialog
    const searchDialog = document.getElementById('searchDialog');
    const searchInput = document.getElementById('searchInput');
    const replaceInput = document.getElementById('replaceInput');
    const searchCount = document.getElementById('searchCount');
    const searchPrevBtn = document.getElementById('searchPrevBtn');
    const searchNextBtn = document.getElementById('searchNextBtn');
    const replaceBtn = document.getElementById('replaceBtn');
    const replaceAllBtn = document.getElementById('replaceAllBtn');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchCaseSensitive = document.getElementById('searchCaseSensitive');
    const searchRegex = document.getElementById('searchRegex');

    // TOC
    const tocSidebar = document.getElementById('tocSidebar');
    const tocContent = document.getElementById('tocContent');
    const tocCloseBtn = document.getElementById('tocCloseBtn');

    // Editor toolbar
    const editorToolbar = document.getElementById('editorToolbar');

    // ========================================
    // State
    // ========================================
    let currentMode = 'preview';
    let currentFileName = 'untitled.md';
    let originalContent = '';
    let isModified = false;
    let hasContent = false;
    let isSyncingScroll = false;

    // Undo/Redo state
    const undoStack = [];
    const redoStack = [];
    let isUndoRedo = false;
    const MAX_UNDO_STACK = 100;

    // Search state
    let searchMatches = [];
    let currentMatchIndex = -1;

    // Theme state
    let currentTheme = localStorage.getItem('theme') || 'dark';

    // Image store - maps short IDs to base64 data
    const imageStore = new Map();
    let imageCounter = 0;

    // ========================================
    // Configure marked.js with extensions
    // ========================================

    // Custom renderer for math and mermaid
    const renderer = new marked.Renderer();

    // Override code block rendering for mermaid
    // Note: marked.js API changed - now receives token object with {text, lang, escaped}
    const originalCodeRenderer = renderer.code.bind(renderer);
    renderer.code = function (token) {
        // Handle both old API (code, language) and new API (token object)
        const code = typeof token === 'object' ? token.text : token;
        const language = typeof token === 'object' ? token.lang : arguments[1];

        if (language === 'mermaid') {
            // Escape HTML entities to prevent XSS and preserve code content
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<div class="mermaid">${escapedCode}</div>`;
        }
        return originalCodeRenderer(token);
    };

    marked.setOptions({
        renderer: renderer,
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false
    });

    // ========================================
    // Initialization
    // ========================================

    function init() {
        // Apply saved theme
        applyTheme(currentTheme);

        // Initialize mermaid
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: currentTheme === 'dark' ? 'dark' : 'default',
                securityLevel: 'loose'
            });
        }

        setupEventListeners();
        updateUIState();
        console.log('Markdown Editor initialized with all features');
    }

    // ========================================
    // Event Listeners Setup
    // ========================================

    function setupEventListeners() {
        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            window.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);

        // Toolbar buttons
        newFileBtn.addEventListener('click', createNewFile);
        openFileBtn.addEventListener('click', () => fileInput.click());
        saveBtn.addEventListener('click', saveFile);

        // Export dropdown
        exportBtn.addEventListener('click', toggleExportDropdown);
        exportMdBtn.addEventListener('click', () => {
            exportAsMarkdown();
            exportDropdown.classList.remove('open');
        });
        exportHtmlBtn.addEventListener('click', () => {
            exportAsHTML();
            exportDropdown.classList.remove('open');
        });
        exportPdfBtn.addEventListener('click', () => {
            exportAsPDF();
            exportDropdown.classList.remove('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportDropdown.contains(e.target)) {
                exportDropdown.classList.remove('open');
            }
        });

        // Undo/Redo
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);

        // Search
        searchBtn.addEventListener('click', toggleSearchDialog);
        searchCloseBtn.addEventListener('click', closeSearchDialog);
        searchInput.addEventListener('input', performSearch);
        searchPrevBtn.addEventListener('click', findPrevious);
        searchNextBtn.addEventListener('click', findNext);
        replaceBtn.addEventListener('click', replaceCurrent);
        replaceAllBtn.addEventListener('click', replaceAll);
        searchCaseSensitive.addEventListener('change', performSearch);
        searchRegex.addEventListener('change', performSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) findPrevious();
                else findNext();
            }
            if (e.key === 'Escape') closeSearchDialog();
        });

        // Print
        printBtn.addEventListener('click', printDocument);

        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // TOC
        tocToggleBtn.addEventListener('click', toggleTOC);
        tocCloseBtn.addEventListener('click', closeTOC);

        // Mode toggle
        previewModeBtn.addEventListener('click', () => setMode('preview'));
        editModeBtn.addEventListener('click', () => setMode('edit'));

        // Editor input with live preview and undo tracking
        editorTextarea.addEventListener('input', handleEditorInput);
        editorTextarea.addEventListener('keydown', handleEditorKeydown);

        // Editor toolbar
        editorToolbar.addEventListener('click', handleEditorToolbarClick);

        // Image paste/drop in editor
        editorTextarea.addEventListener('paste', handleImagePaste);
        editorTextarea.addEventListener('drop', handleImageDrop);

        // Synchronized scrolling
        editorTextarea.addEventListener('scroll', () => syncScroll('editor'));
        previewContent.addEventListener('scroll', () => syncScroll('preview'));

        // Split resizer drag
        setupSplitResizer();

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ========================================
    // Undo/Redo System
    // ========================================

    function saveUndoState() {
        if (isUndoRedo) return;

        const currentState = {
            content: editorTextarea.value,
            selectionStart: editorTextarea.selectionStart,
            selectionEnd: editorTextarea.selectionEnd
        };

        // Don't save if content hasn't changed
        if (undoStack.length > 0 && undoStack[undoStack.length - 1].content === currentState.content) {
            return;
        }

        undoStack.push(currentState);

        // Limit stack size
        if (undoStack.length > MAX_UNDO_STACK) {
            undoStack.shift();
        }

        // Clear redo stack on new action
        redoStack.length = 0;

        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length <= 1) return;

        isUndoRedo = true;

        // Save current state to redo stack
        redoStack.push({
            content: editorTextarea.value,
            selectionStart: editorTextarea.selectionStart,
            selectionEnd: editorTextarea.selectionEnd
        });

        // Pop current state and get previous
        undoStack.pop();
        const previousState = undoStack[undoStack.length - 1];

        editorTextarea.value = previousState.content;
        editorTextarea.setSelectionRange(previousState.selectionStart, previousState.selectionEnd);

        handleEditorInput();
        updateUndoRedoButtons();

        isUndoRedo = false;
        showToast('已復原', 'info');
    }

    function redo() {
        if (redoStack.length === 0) return;

        isUndoRedo = true;

        const nextState = redoStack.pop();

        undoStack.push({
            content: editorTextarea.value,
            selectionStart: editorTextarea.selectionStart,
            selectionEnd: editorTextarea.selectionEnd
        });

        editorTextarea.value = nextState.content;
        editorTextarea.setSelectionRange(nextState.selectionStart, nextState.selectionEnd);

        handleEditorInput();
        updateUndoRedoButtons();

        isUndoRedo = false;
        showToast('已重做', 'info');
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = undoStack.length <= 1 || !hasContent;
        redoBtn.disabled = redoStack.length === 0 || !hasContent;
    }

    // ========================================
    // Search & Replace
    // ========================================

    function toggleSearchDialog() {
        if (searchDialog.hidden) {
            searchDialog.hidden = false;
            searchInput.focus();
            searchInput.select();
        } else {
            closeSearchDialog();
        }
    }

    function closeSearchDialog() {
        searchDialog.hidden = true;
        searchMatches = [];
        currentMatchIndex = -1;
        searchCount.textContent = '0/0';
        
        // Clear highlights in preview containers
        clearPreviewHighlights(markdownContent);
        clearPreviewHighlights(previewContent);
    }

    function performSearch() {
        const query = searchInput.value;
        if (!query) {
            searchMatches = [];
            currentMatchIndex = -1;
            searchCount.textContent = '0/0';
            return;
        }

        const content = editorTextarea.value;
        const caseSensitive = searchCaseSensitive.checked;
        const useRegex = searchRegex.checked;

        searchMatches = [];

        try {
            let regex;
            if (useRegex) {
                regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
            } else {
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
            }

            let match;
            while ((match = regex.exec(content)) !== null) {
                searchMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0]
                });
            }
        } catch (e) {
            // Invalid regex
            searchCount.textContent = '無效';
            return;
        }

        if (searchMatches.length > 0) {
            currentMatchIndex = 0;
            highlightMatch();
        } else {
            currentMatchIndex = -1;
        }

        updateSearchCount();
    }

    function updateSearchCount() {
        if (searchMatches.length === 0) {
            searchCount.textContent = '0/0';
        } else {
            searchCount.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
        }
    }

    function highlightMatch() {
        if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

        const match = searchMatches[currentMatchIndex];
        
        // Always highlight in editor textarea
        editorTextarea.focus();
        editorTextarea.setSelectionRange(match.start, match.end);

        // Scroll editor to match
        const lineHeight = parseInt(getComputedStyle(editorTextarea).lineHeight);
        const lines = editorTextarea.value.substr(0, match.start).split('\n').length - 1;
        editorTextarea.scrollTop = lines * lineHeight - editorTextarea.clientHeight / 2;

        // Also highlight in preview content (for both edit and preview modes)
        highlightInPreview(match.text);
    }

    // Highlight search results in preview content and scroll to them
    function highlightInPreview(searchText) {
        // Determine which container to use based on mode
        const container = currentMode === 'preview' ? markdownContent : previewContent;
        
        // Clear previous highlights
        clearPreviewHighlights(container);
        
        if (!searchText) return;

        // Create TreeWalker to find all text nodes
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                textNodes.push(node);
            }
        }

        let firstMatch = null;
        const caseSensitive = searchCaseSensitive.checked;

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const searchLower = caseSensitive ? searchText : searchText.toLowerCase();
            const textToSearch = caseSensitive ? text : text.toLowerCase();
            
            let index = textToSearch.indexOf(searchLower);
            if (index === -1) return;

            const parent = textNode.parentNode;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            while (index !== -1) {
                // Add text before match
                if (index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
                }

                // Create highlight mark
                const mark = document.createElement('mark');
                mark.className = 'search-highlight-preview';
                mark.textContent = text.substring(index, index + searchText.length);
                fragment.appendChild(mark);

                if (!firstMatch) {
                    firstMatch = mark;
                    mark.classList.add('search-highlight-current');
                }

                lastIndex = index + searchText.length;
                index = textToSearch.indexOf(searchLower, lastIndex);
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            parent.replaceChild(fragment, textNode);
        });

        // Scroll to first match
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Clear previous highlights from preview
    function clearPreviewHighlights(container) {
        const marks = container.querySelectorAll('mark.search-highlight-preview');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    function findNext() {
        if (searchMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
        highlightMatch();
        updateSearchCount();
    }

    function findPrevious() {
        if (searchMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        highlightMatch();
        updateSearchCount();
    }

    function replaceCurrent() {
        if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

        const replacement = replaceInput.value;
        const match = searchMatches[currentMatchIndex];

        saveUndoState();

        const content = editorTextarea.value;
        editorTextarea.value = content.substring(0, match.start) + replacement + content.substring(match.end);

        handleEditorInput();
        performSearch();
        showToast('已取代 1 處', 'success');
    }

    function replaceAll() {
        if (searchMatches.length === 0) return;

        const replacement = replaceInput.value;
        const query = searchInput.value;
        const caseSensitive = searchCaseSensitive.checked;
        const useRegex = searchRegex.checked;

        saveUndoState();

        let regex;
        if (useRegex) {
            regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } else {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
        }

        const count = searchMatches.length;
        editorTextarea.value = editorTextarea.value.replace(regex, replacement);

        handleEditorInput();
        performSearch();
        showToast(`已取代 ${count} 處`, 'success');
    }

    // ========================================
    // Theme Toggle
    // ========================================

    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
        showToast(`已切換至${currentTheme === 'dark' ? '暗色' : '亮色'}主題`, 'info');
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update highlight.js theme
        const hljsTheme = document.getElementById('hljs-theme');
        if (hljsTheme) {
            hljsTheme.href = theme === 'dark'
                ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
                : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        }

        // Update mermaid theme and re-render existing diagrams
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: theme === 'dark' ? 'dark' : 'default',
                securityLevel: 'loose'
            });

            // Re-render mermaid diagrams with new theme
            reRenderMermaidDiagrams();
        }
    }

    // Re-render all mermaid diagrams with current theme
    function reRenderMermaidDiagrams() {
        if (!hasContent) return;

        // Small delay to ensure mermaid.initialize() has taken effect
        setTimeout(() => {
            // Force re-render by regenerating the preview content
            // This will recreate mermaid divs from the original markdown
            if (currentMode === 'preview') {
                renderFullPreview();
            } else {
                renderPreview();
            }
        }, 50);
    }

    // ========================================
    // TOC (Table of Contents)
    // ========================================

    function toggleTOC() {
        if (tocSidebar.hidden) {
            generateTOC();
            tocSidebar.hidden = false;
            setTimeout(() => tocSidebar.classList.add('open'), 10);
        } else {
            closeTOC();
        }
    }

    function closeTOC() {
        tocSidebar.classList.remove('open');
        setTimeout(() => {
            tocSidebar.hidden = true;
        }, 250);
    }

    function generateTOC() {
        const content = editorTextarea.value;
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;

        tocContent.innerHTML = '';

        let match;
        let index = 0;
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            const text = match[2].replace(/[*_`]/g, ''); // Remove formatting
            const position = match.index;

            const tocItem = document.createElement('button');
            tocItem.className = `toc-item level-${level}`;
            tocItem.textContent = text;
            tocItem.dataset.position = position;
            tocItem.dataset.headingText = text;
            tocItem.dataset.headingLevel = level;
            tocItem.addEventListener('click', () => scrollToHeading(text, level, position));

            tocContent.appendChild(tocItem);
            index++;
        }

        if (index === 0) {
            tocContent.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: var(--space-md);">沒有找到標題</p>';
        }
    }

    function scrollToHeading(headingText, level, editorPosition) {
        // Determine which container to scroll based on current mode
        const container = currentMode === 'preview' ? markdownContent : previewContent;

        // Find the matching heading in the preview
        const headingTag = `h${level}`;
        const headings = container.querySelectorAll(headingTag);

        let targetHeading = null;
        for (const heading of headings) {
            // Match by text content (normalized)
            const normalizedHeadingText = heading.textContent.trim().replace(/\s+/g, ' ');
            const normalizedSearchText = headingText.trim().replace(/\s+/g, ' ');

            if (normalizedHeadingText === normalizedSearchText) {
                targetHeading = heading;
                break;
            }
        }

        if (targetHeading) {
            // Scroll the preview/markdown content to the heading
            targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Add a highlight effect
            targetHeading.style.transition = 'background-color 0.3s ease';
            targetHeading.style.backgroundColor = 'rgba(88, 166, 255, 0.2)';
            setTimeout(() => {
                targetHeading.style.backgroundColor = '';
            }, 1500);
        }

        // Also scroll the editor if in edit mode
        if (currentMode === 'edit') {
            const lineHeight = parseInt(getComputedStyle(editorTextarea).lineHeight);
            const lines = editorTextarea.value.substr(0, editorPosition).split('\n').length - 1;
            editorTextarea.scrollTop = lines * lineHeight - editorTextarea.clientHeight / 3;
        }

        closeTOC();
    }

    function scrollToPosition(position) {
        editorTextarea.focus();
        editorTextarea.setSelectionRange(position, position);

        const lineHeight = parseInt(getComputedStyle(editorTextarea).lineHeight);
        const lines = editorTextarea.value.substr(0, position).split('\n').length - 1;
        editorTextarea.scrollTop = lines * lineHeight;

        closeTOC();
    }

    // ========================================
    // Editor Toolbar Actions
    // ========================================

    function handleEditorToolbarClick(e) {
        const btn = e.target.closest('.editor-toolbar-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        if (!action) return;

        saveUndoState();
        insertFormatting(action);
    }

    function insertFormatting(action) {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const selectedText = editorTextarea.value.substring(start, end);
        const beforeText = editorTextarea.value.substring(0, start);
        const afterText = editorTextarea.value.substring(end);

        let insertion = '';
        let cursorOffset = 0;
        let selectStart = start;
        let selectEnd = end;

        switch (action) {
            case 'bold':
                insertion = `**${selectedText || '粗體文字'}**`;
                if (!selectedText) { selectStart = start + 2; selectEnd = start + 6; }
                else { selectStart = start; selectEnd = start + insertion.length; }
                break;
            case 'italic':
                insertion = `*${selectedText || '斜體文字'}*`;
                if (!selectedText) { selectStart = start + 1; selectEnd = start + 5; }
                else { selectStart = start; selectEnd = start + insertion.length; }
                break;
            case 'strikethrough':
                insertion = `~~${selectedText || '刪除線文字'}~~`;
                if (!selectedText) { selectStart = start + 2; selectEnd = start + 7; }
                else { selectStart = start; selectEnd = start + insertion.length; }
                break;
            case 'h1':
                insertion = `# ${selectedText || '標題 1'}`;
                if (!selectedText) { selectStart = start + 2; selectEnd = start + 6; }
                break;
            case 'h2':
                insertion = `## ${selectedText || '標題 2'}`;
                if (!selectedText) { selectStart = start + 3; selectEnd = start + 7; }
                break;
            case 'h3':
                insertion = `### ${selectedText || '標題 3'}`;
                if (!selectedText) { selectStart = start + 4; selectEnd = start + 8; }
                break;
            case 'link':
                if (selectedText) {
                    insertion = `[${selectedText}](url)`;
                    selectStart = start + selectedText.length + 3;
                    selectEnd = selectStart + 3;
                } else {
                    insertion = '[連結文字](url)';
                    selectStart = start + 1;
                    selectEnd = start + 5;
                }
                break;
            case 'image':
                insertion = `![${selectedText || '圖片描述'}](image-url)`;
                if (!selectedText) { selectStart = start + 2; selectEnd = start + 6; }
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    insertion = `\`\`\`\n${selectedText}\n\`\`\``;
                } else {
                    insertion = `\`${selectedText || '程式碼'}\``;
                    if (!selectedText) { selectStart = start + 1; selectEnd = start + 4; }
                }
                break;
            case 'quote':
                if (selectedText) {
                    insertion = selectedText.split('\n').map(line => `> ${line}`).join('\n');
                } else {
                    insertion = '> 引用文字';
                    selectStart = start + 2;
                    selectEnd = start + 6;
                }
                break;
            case 'ul':
                if (selectedText) {
                    insertion = selectedText.split('\n').map(line => `- ${line}`).join('\n');
                } else {
                    insertion = '- 項目';
                    selectStart = start + 2;
                    selectEnd = start + 4;
                }
                break;
            case 'ol':
                if (selectedText) {
                    insertion = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
                } else {
                    insertion = '1. 項目';
                    selectStart = start + 3;
                    selectEnd = start + 5;
                }
                break;
            case 'task':
                if (selectedText) {
                    insertion = selectedText.split('\n').map(line => `- [ ] ${line}`).join('\n');
                } else {
                    insertion = '- [ ] 待辦事項';
                    selectStart = start + 6;
                    selectEnd = start + 10;
                }
                break;
            case 'table':
                insertion = `| 標題 1 | 標題 2 | 標題 3 |
|--------|--------|--------|
| 內容 1 | 內容 2 | 內容 3 |
| 內容 4 | 內容 5 | 內容 6 |`;
                selectStart = start + 2;
                selectEnd = start + 6;
                break;
            case 'math':
                if (selectedText) {
                    insertion = selectedText.includes('\n') ? `$$\n${selectedText}\n$$` : `$${selectedText}$`;
                } else {
                    insertion = '$$\nE = mc^2\n$$';
                    selectStart = start + 3;
                    selectEnd = start + 12;
                }
                break;
            case 'mermaid':
                insertion = `\`\`\`mermaid
graph TD
    A[開始] --> B{判斷}
    B -->|是| C[結果 1]
    B -->|否| D[結果 2]
\`\`\``;
                selectStart = start + 12;
                selectEnd = start + 20;
                break;
            case 'convertMd':
                insertion = convertToMarkdown(selectedText);
                selectStart = start;
                selectEnd = start + insertion.length;
                break;
            default:
                return;
        }

        editorTextarea.value = beforeText + insertion + afterText;
        editorTextarea.focus();
        editorTextarea.setSelectionRange(selectStart, selectEnd);

        handleEditorInput();
    }

    function handleEditorKeydown(e) {
        // Ctrl+Shift+M for Convert to MD
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            const selectedText = editorTextarea.value.substring(
                editorTextarea.selectionStart,
                editorTextarea.selectionEnd
            );
            if (selectedText) {
                saveUndoState();
                insertFormatting('convertMd');
                showToast('已轉換為 Markdown 格式', 'success');
            } else {
                showToast('請先選取要轉換的文字', 'warning');
            }
            return;
        }

        // Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editorTextarea.selectionStart;
            const end = editorTextarea.selectionEnd;

            saveUndoState();

            if (e.shiftKey) {
                // Outdent
                const lineStart = editorTextarea.value.lastIndexOf('\n', start - 1) + 1;
                const lineContent = editorTextarea.value.substring(lineStart, start);
                if (lineContent.startsWith('  ') || lineContent.startsWith('\t')) {
                    const removeChars = lineContent.startsWith('\t') ? 1 : 2;
                    editorTextarea.value = editorTextarea.value.substring(0, lineStart) +
                        editorTextarea.value.substring(lineStart + removeChars);
                    editorTextarea.setSelectionRange(start - removeChars, end - removeChars);
                    handleEditorInput();
                }
            } else {
                // Indent
                editorTextarea.value = editorTextarea.value.substring(0, start) + '  ' +
                    editorTextarea.value.substring(end);
                editorTextarea.setSelectionRange(start + 2, start + 2);
                handleEditorInput();
            }
        }
    }

    // ========================================
    // Convert to Markdown
    // ========================================

    function convertToMarkdown(text) {
        if (!text || !text.trim()) return text;

        const type = detectTextType(text);

        switch (type) {
            case 'table':
                return convertToTable(text);
            case 'url':
                return convertToLink(text);
            case 'orderedList':
                return convertToOrderedList(text);
            case 'unorderedList':
                return convertToUnorderedList(text);
            default:
                return text;
        }
    }

    function detectTextType(text) {
        const lines = text.trim().split('\n');

        // 1. 檢查是否為 URL
        const urlPattern = /^https?:\/\/[^\s]+$/i;
        if (lines.length === 1 && urlPattern.test(text.trim())) {
            return 'url';
        }

        // 2. 檢查是否為表格數據 (Tab 或多空格分隔)
        if (lines.length >= 1) {
            const hasTabSeparator = lines.some(line => line.includes('\t'));
            const hasMultiSpaceSeparator = lines.some(line => /\s{2,}/.test(line));
            if (hasTabSeparator || hasMultiSpaceSeparator) {
                return 'table';
            }
        }

        // 3. 檢查是否為編號列表
        const orderedPattern = /^\d+[\.)、]\s*/;
        const nonEmptyLines = lines.filter(line => line.trim());
        if (nonEmptyLines.length > 0 && nonEmptyLines.every(line => orderedPattern.test(line.trim()))) {
            return 'orderedList';
        }

        // 4. 檢查是否為逗號/頓號分隔的列表
        if (lines.length === 1 && /[,，、]/.test(text)) {
            return 'unorderedList';
        }

        return 'unknown';
    }

    function convertToTable(text) {
        const lines = text.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) return text;

        // 偵測分隔符
        const separator = lines[0].includes('\t') ? '\t' : /\s{2,}/;

        // 分割每行
        const rows = lines.map(line =>
            line.split(separator).map(cell => cell.trim()).filter(cell => cell)
        );

        if (rows.length === 0) return text;

        // 取得最大欄數
        const maxCols = Math.max(...rows.map(row => row.length));

        // 使用第一行作為表頭
        const headers = rows[0];
        while (headers.length < maxCols) headers.push(`Column ${headers.length + 1}`);

        // 生成 Markdown 表格
        let table = '| ' + headers.join(' | ') + ' |\n';
        table += '|' + headers.map(() => '---').join('|') + '|\n';

        // 從第二行開始作為資料行
        for (let i = 1; i < rows.length; i++) {
            const paddedRow = [...rows[i]];
            while (paddedRow.length < maxCols) paddedRow.push('');
            table += '| ' + paddedRow.join(' | ') + ' |\n';
        }

        return table.trim();
    }

    function convertToLink(text) {
        const url = text.trim();
        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        return `[${domain}](${url})`;
    }

    function convertToOrderedList(text) {
        const lines = text.trim().split('\n');
        return lines
            .filter(line => line.trim())
            .map((line, i) => {
                const cleaned = line.replace(/^\d+[\.)、]\s*/, '').trim();
                return `${i + 1}. ${cleaned}`;
            })
            .join('\n');
    }

    function convertToUnorderedList(text) {
        const items = text.split(/[,，、]/).map(item => item.trim()).filter(item => item);
        return items.map(item => `- ${item}`).join('\n');
    }

    // ========================================
    // Image Handling
    // ========================================

    function handleImagePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                insertImageAsBase64(file);
                break;
            }
        }
    }

    function handleImageDrop(e) {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            insertImageAsBase64(file);
        }
    }

    function insertImageAsBase64(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const base64 = e.target.result;

            // Generate short ID and store in image store
            imageCounter++;
            const imageId = `img:${imageCounter}`;
            imageStore.set(imageId, base64);

            // Use short reference in markdown
            const altText = file.name.replace(/\.[^/.]+$/, '') || `Image${imageCounter}`;
            const markdown = `![${altText}](${imageId})`;

            saveUndoState();

            const start = editorTextarea.selectionStart;
            const beforeText = editorTextarea.value.substring(0, start);
            const afterText = editorTextarea.value.substring(start);

            editorTextarea.value = beforeText + markdown + afterText;
            editorTextarea.setSelectionRange(start + markdown.length, start + markdown.length);

            handleEditorInput();
            showToast(`已插入圖片: ${file.name} (${imageId})`, 'success');
        };

        reader.onerror = () => {
            showToast('讀取圖片失敗', 'error');
        };

        reader.readAsDataURL(file);
    }

    // ========================================
    // Word Count & Statistics
    // ========================================

    function updateWordCount() {
        const content = editorTextarea.value;

        // Count characters (with and without spaces)
        const charsWithSpaces = content.length;
        const charsNoSpaces = content.replace(/\s/g, '').length;

        // Count words (handle Chinese characters)
        const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
        const englishWords = content.replace(/[\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0).length;
        const totalWords = chineseChars + englishWords;

        // Count lines
        const lines = content.split('\n').length;

        // Estimate reading time (200 Chinese chars/min or 200 English words/min)
        const readingTime = Math.ceil(totalWords / 200);

        wordCountTextEl.textContent = `${totalWords} 字`;
        fileStatsEl.textContent = `${charsNoSpaces} 字元 | ${lines} 行 | 約 ${readingTime} 分鐘`;
    }

    // ========================================
    // Synchronized Scrolling
    // ========================================

    function syncScroll(source) {
        if (isSyncingScroll) return;
        isSyncingScroll = true;

        requestAnimationFrame(() => {
            if (source === 'editor') {
                const scrollRatio = editorTextarea.scrollTop /
                    (editorTextarea.scrollHeight - editorTextarea.clientHeight);
                const targetScrollTop = scrollRatio *
                    (previewContent.scrollHeight - previewContent.clientHeight);
                previewContent.scrollTop = targetScrollTop || 0;
            } else {
                const scrollRatio = previewContent.scrollTop /
                    (previewContent.scrollHeight - previewContent.clientHeight);
                const targetScrollTop = scrollRatio *
                    (editorTextarea.scrollHeight - editorTextarea.clientHeight);
                editorTextarea.scrollTop = targetScrollTop || 0;
            }

            setTimeout(() => {
                isSyncingScroll = false;
            }, 50);
        });
    }

    // ========================================
    // Split Resizer
    // ========================================

    function setupSplitResizer() {
        let isResizing = false;
        let startX = 0;
        let startLeftWidth = 0;

        splitResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startLeftWidth = document.querySelector('.editor-pane').offsetWidth;
            splitResizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const delta = e.clientX - startX;
            const newLeftWidth = startLeftWidth + delta;
            const containerWidth = splitView.offsetWidth;
            const minWidth = 250;
            const maxWidth = containerWidth - minWidth - 4;

            if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
                const leftPercent = (newLeftWidth / containerWidth) * 100;
                const rightPercent = 100 - leftPercent - (4 / containerWidth * 100);

                document.querySelector('.editor-pane').style.flex = `0 0 ${leftPercent}%`;
                document.querySelector('.preview-pane').style.flex = `0 0 ${rightPercent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                splitResizer.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // ========================================
    // File Handling
    // ========================================

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        // Check if it's an image for the drop zone (redirect to editor)
        if (file.type.startsWith('image/') && hasContent && currentMode === 'edit') {
            insertImageAsBase64(file);
            return;
        }

        const validExtensions = ['.md', '.markdown', '.txt'];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValid) {
            showToast('請選擇有效的 Markdown 檔案 (.md 或 .markdown)', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            // Convert .txt extension to .md for markdown workflow
            currentFileName = file.name.replace(/\.txt$/i, '.md');
            originalContent = content;
            loadContent(content);
            showToast(`已載入 ${file.name}`, 'success');
        };

        reader.onerror = () => {
            showToast('讀取檔案失敗，請重試', 'error');
        };

        reader.readAsText(file);
    }

    function loadContent(content) {
        // Parse and restore hidden image data block
        const { cleanContent, images } = parseImageDataBlock(content);

        // Restore images to store
        images.forEach((base64, imageId) => {
            imageStore.set(imageId, base64);
            // Update counter to avoid ID conflicts
            const idNum = parseInt(imageId.replace('img:', ''));
            if (idNum >= imageCounter) {
                imageCounter = idNum;
            }
        });

        editorTextarea.value = cleanContent;

        // Initialize undo stack
        undoStack.length = 0;
        redoStack.length = 0;
        undoStack.push({
            content: cleanContent,
            selectionStart: 0,
            selectionEnd: 0
        });

        renderPreview();
        renderFullPreview();
        hasContent = true;
        isModified = false;
        updateUIState();
        updateWordCount();

        // Show content area, hide drop zone
        dropZone.classList.add('hidden');

        // Default to preview mode
        setMode('preview');

        // Show toast if images were restored
        if (images.size > 0) {
            showToast(`已還原 ${images.size} 張圖片`, 'success');
        }
    }

    // Parse hidden image data block from markdown content
    function parseImageDataBlock(content) {
        const images = new Map();
        const blockRegex = /\n?<!-- IMAGE_DATA_START\n([\s\S]*?)\nIMAGE_DATA_END -->/;
        const match = content.match(blockRegex);

        if (match) {
            const dataBlock = match[1];
            const lines = dataBlock.split('\n');

            for (const line of lines) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex > 0) {
                    const imageId = line.substring(0, separatorIndex);
                    const base64 = line.substring(separatorIndex + 1);
                    if (imageId && base64) {
                        images.set(imageId, base64);
                    }
                }
            }

            // Remove the data block from content
            const cleanContent = content.replace(blockRegex, '').trimEnd();
            return { cleanContent, images };
        }

        return { cleanContent: content, images };
    }

    // Generate hidden image data block for saving
    function generateImageDataBlock() {
        if (imageStore.size === 0) {
            return '';
        }

        // Only include images that are actually used in the content
        const content = editorTextarea.value;
        const usedImages = new Map();

        for (const [imageId, base64] of imageStore) {
            if (content.includes(`(${imageId})`)) {
                usedImages.set(imageId, base64);
            }
        }

        if (usedImages.size === 0) {
            return '';
        }

        let block = '\n\n<!-- IMAGE_DATA_START\n';
        for (const [imageId, base64] of usedImages) {
            block += `${imageId}=${base64}\n`;
        }
        block += 'IMAGE_DATA_END -->';

        return block;
    }

    function createNewFile() {
        if (isModified) {
            if (!confirm('目前的變更尚未儲存，確定要新建檔案嗎？')) {
                return;
            }
        }

        currentFileName = 'untitled.md';
        originalContent = '';
        editorTextarea.value = '';
        previewContent.innerHTML = '';
        markdownContent.innerHTML = '';

        // Reset undo stack
        undoStack.length = 0;
        redoStack.length = 0;
        undoStack.push({
            content: '',
            selectionStart: 0,
            selectionEnd: 0
        });

        hasContent = true;
        isModified = false;

        dropZone.classList.add('hidden');
        setMode('edit');
        updateUIState();
        updateWordCount();

        editorTextarea.focus();
        showToast('已新建檔案', 'success');
    }

    // ========================================
    // Mode Handling
    // ========================================

    function setMode(mode) {
        currentMode = mode;

        // Update button states
        previewModeBtn.classList.toggle('active', mode === 'preview');
        editModeBtn.classList.toggle('active', mode === 'edit');

        if (mode === 'preview') {
            renderFullPreview();
            splitView.classList.remove('visible');
            markdownContent.classList.add('visible');
        } else {
            renderPreview();
            splitView.classList.add('visible');
            markdownContent.classList.remove('visible');
            editorTextarea.focus();
        }
    }

    // ========================================
    // Editor Handling
    // ========================================

    let debounceTimer;
    let undoDebounceTimer;

    function handleEditorInput() {
        isModified = editorTextarea.value !== originalContent;
        updateFileStatus();
        updateWordCount();

        // Debounced undo state save
        clearTimeout(undoDebounceTimer);
        undoDebounceTimer = setTimeout(() => {
            saveUndoState();
        }, 500);

        // Debounced live preview update
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            renderPreview();
        }, 150);
    }

    function renderPreview() {
        try {
            const content = editorTextarea.value;
            const html = renderMarkdownWithMath(content);
            previewContent.innerHTML = html;

            // Apply syntax highlighting
            previewContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // Render mermaid diagrams
            renderMermaid(previewContent);

            // Wrap tables in scrollable containers
            wrapTablesWithScrollContainer(previewContent);
        } catch (err) {
            console.error('Render error:', err);
        }
    }

    function renderFullPreview() {
        try {
            const content = editorTextarea.value;
            const html = renderMarkdownWithMath(content);
            markdownContent.innerHTML = html;

            // Apply syntax highlighting
            markdownContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // Render mermaid diagrams
            renderMermaid(markdownContent);

            // Wrap tables in scrollable containers
            wrapTablesWithScrollContainer(markdownContent);
        } catch (err) {
            console.error('Render error:', err);
            showToast('渲染 Markdown 時發生錯誤', 'error');
        }
    }

    // Auto-wrap all <table> elements with a scrollable container div
    function wrapTablesWithScrollContainer(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach((table) => {
            // Skip if already wrapped
            if (table.parentElement && table.parentElement.classList.contains('table-scroll-wrapper')) {
                return;
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'table-scroll-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);

            // Detect overflow and add class for scroll shadow hints
            requestAnimationFrame(() => {
                if (wrapper.scrollWidth > wrapper.clientWidth) {
                    wrapper.classList.add('has-overflow');
                }
            });
        });
    }

    function renderMarkdownWithMath(content) {
        // Replace image references (img:X) with actual base64 data
        content = content.replace(/!\[([^\]]*)\]\((img:\d+)\)/g, (match, altText, imageId) => {
            const base64 = imageStore.get(imageId);
            if (base64) {
                return `![${altText}](${base64})`;
            }
            return match; // Keep original if not found
        });

        // Process block math first ($$...$$)
        content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
            try {
                return `<div class="katex-display">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
            } catch (e) {
                return `<div class="katex-error">${escapeHtml(math)}</div>`;
            }
        });

        // Process inline math ($...$) - be careful not to match $$ or currency
        content = content.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, math) => {
            try {
                return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
            } catch (e) {
                return `<span class="katex-error">${escapeHtml(math)}</span>`;
            }
        });

        return marked.parse(content);
    }

    function renderMermaid(container) {
        if (typeof mermaid === 'undefined') return;

        const mermaidDivs = container.querySelectorAll('.mermaid:not([data-processed])');
        if (mermaidDivs.length === 0) return;

        mermaidDivs.forEach((div, index) => {
            // Mark as processed to avoid re-rendering
            div.setAttribute('data-processed', 'true');

            const id = `mermaid-${Date.now()}-${index}`;
            // Get the text content and unescape HTML entities
            let code = div.textContent || div.innerText;
            code = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .trim();

            try {
                mermaid.render(id, code).then(({ svg }) => {
                    div.innerHTML = svg;
                }).catch(err => {
                    console.error('Mermaid render error:', err);
                    div.innerHTML = `<pre class="mermaid-error">Mermaid 渲染錯誤: ${err.message}</pre>`;
                });
            } catch (err) {
                console.error('Mermaid render error:', err);
                div.innerHTML = `<pre class="mermaid-error">Mermaid 渲染錯誤: ${err.message}</pre>`;
            }
        });
    }

    // Async version of renderMermaid that returns a Promise
    async function renderMermaidAndWait(container) {
        if (typeof mermaid === 'undefined') return;

        const mermaidDivs = container.querySelectorAll('.mermaid:not([data-processed])');
        if (mermaidDivs.length === 0) return;

        const promises = [...mermaidDivs].map((div, index) => {
            return new Promise((resolve) => {
                div.setAttribute('data-processed', 'true');

                const id = `mermaid-pdf-${Date.now()}-${index}`;
                let code = div.textContent || div.innerText;
                code = code
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .trim();

                try {
                    mermaid.render(id, code).then(({ svg }) => {
                        div.innerHTML = svg;
                        resolve();
                    }).catch(err => {
                        console.error('Mermaid render error:', err);
                        div.innerHTML = `<pre class="mermaid-error">Mermaid 渲染錯誤: ${err.message}</pre>`;
                        resolve();
                    });
                } catch (err) {
                    console.error('Mermaid render error:', err);
                    div.innerHTML = `<pre class="mermaid-error">Mermaid 渲染錯誤: ${err.message}</pre>`;
                    resolve();
                }
            });
        });

        await Promise.all(promises);
    }

    // Scale Mermaid SVGs to fit within page width for PDF export
    function scaleMermaidSVGs(container, maxWidth = 632) {
        const svgs = container.querySelectorAll('.mermaid svg');
        svgs.forEach(svg => {
            let originalWidth = 0;
            let originalHeight = 0;

            // Try to get dimensions from viewBox first
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/);
                if (parts.length >= 4) {
                    originalWidth = parseFloat(parts[2]) || 0;
                    originalHeight = parseFloat(parts[3]) || 0;
                }
            }

            // Fallback to width/height attributes
            if (!originalWidth) {
                const widthAttr = svg.getAttribute('width');
                const heightAttr = svg.getAttribute('height');
                if (widthAttr) {
                    originalWidth = parseFloat(widthAttr.replace(/px|%/, '')) || 0;
                }
                if (heightAttr) {
                    originalHeight = parseFloat(heightAttr.replace(/px|%/, '')) || 0;
                }
            }

            // Fallback to getBoundingClientRect
            if (!originalWidth || !originalHeight) {
                const rect = svg.getBoundingClientRect();
                originalWidth = originalWidth || rect.width;
                originalHeight = originalHeight || rect.height;
            }

            // Scale if exceeds max width
            if (originalWidth > maxWidth && originalWidth > 0 && originalHeight > 0) {
                const scale = maxWidth / originalWidth;
                const newWidth = Math.floor(originalWidth * scale);
                const newHeight = Math.floor(originalHeight * scale);
                svg.setAttribute('width', `${newWidth}px`);
                svg.setAttribute('height', `${newHeight}px`);
                svg.style.maxWidth = '100%';
            } else {
                // Ensure SVG has explicit pixel dimensions
                if (originalWidth > 0 && originalHeight > 0) {
                    svg.setAttribute('width', `${Math.floor(originalWidth)}px`);
                    svg.setAttribute('height', `${Math.floor(originalHeight)}px`);
                }
                svg.style.maxWidth = '100%';
            }
        });
    }

    // ========================================
    // Save & Export
    // ========================================

    // Prepare content for saving: keep short references but append hidden data block
    function prepareContentForSave(content) {
        // Remove any existing image data block first
        const cleanContent = content.replace(/\n?<!-- IMAGE_DATA_START\n[\s\S]*?\nIMAGE_DATA_END -->/, '').trimEnd();

        // Append new image data block
        const imageBlock = generateImageDataBlock();

        return cleanContent + imageBlock;
    }

    async function saveFile() {
        // Prepare content with hidden image data block
        const content = prepareContentForSave(editorTextarea.value);

        // Try using File System Access API
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFileName,
                    types: [{
                        description: 'Markdown Files',
                        accept: { 'text/markdown': ['.md', '.markdown'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();

                currentFileName = handle.name;
                originalContent = editorTextarea.value; // Keep editor content as original
                isModified = false;
                updateFileStatus();
                showToast(`已儲存 ${currentFileName}`, 'success');
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // User cancelled
                console.warn('File System Access API failed, falling back to download');
            }
        }

        // Fallback to download
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, currentFileName);
        originalContent = editorTextarea.value;
        isModified = false;
        updateFileStatus();
        showToast(`已儲存 ${currentFileName}`, 'success');
    }

    async function exportAsMarkdown() {
        // Prepare content with hidden image data block
        const content = prepareContentForSave(editorTextarea.value);

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFileName,
                    types: [{
                        description: 'Markdown Files',
                        accept: { 'text/markdown': ['.md', '.markdown'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();

                showToast(`已導出 ${handle.name}`, 'success');
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, currentFileName);
        showToast(`已儲存 ${currentFileName}`, 'success');
    }

    async function exportAsHTML() {
        const content = editorTextarea.value;
        const htmlContent = renderMarkdownWithMath(content);

        // Get theme-specific colors
        const isDark = currentTheme === 'dark';
        const colors = isDark ? {
            bg: '#0d1117',
            bgSecondary: '#161b22',
            bgTertiary: '#21262d',
            text: '#e6edf3',
            textSecondary: '#8b949e',
            border: '#30363d',
            link: '#58a6ff',
            codeText: '#d29922'
        } : {
            bg: '#ffffff',
            bgSecondary: '#f6f8fa',
            bgTertiary: '#eaeef2',
            text: '#1f2328',
            textSecondary: '#656d76',
            border: '#d0d7de',
            link: '#0969da',
            codeText: '#bf8700'
        };

        const fullHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(currentFileName.replace(/\.(md|markdown)$/i, ''))}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 3rem 2rem;
            color: ${colors.text};
            background: ${colors.bg};
        }
        h1, h2, h3, h4, h5, h6 { 
            margin-top: 2em; 
            margin-bottom: 0.75em; 
            font-weight: 600;
            line-height: 1.3;
        }
        h1 { font-size: 2.25rem; border-bottom: 1px solid ${colors.border}; padding-bottom: 0.5em; }
        h2 { font-size: 1.75rem; border-bottom: 1px solid ${colors.border}; padding-bottom: 0.4em; }
        h3 { font-size: 1.375rem; }
        h4 { font-size: 1.125rem; }
        h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
        p { margin-bottom: 1em; }
        code { 
            font-family: 'JetBrains Mono', Consolas, monospace;
            font-size: 0.875em;
        }
        :not(pre) > code { 
            background: ${colors.bgTertiary}; 
            padding: 0.2em 0.4em; 
            border-radius: 6px; 
            color: ${colors.codeText};
            border: 1px solid ${colors.border};
        }
        pre { 
            background: ${colors.bgSecondary}; 
            padding: 1.25em; 
            border-radius: 8px; 
            overflow-x: auto;
            margin: 1em 0;
            border: 1px solid ${colors.border};
        }
        pre code { 
            background: transparent; 
            padding: 0; 
            color: ${colors.text};
            border: none;
            font-size: 0.875rem;
            line-height: 1.7;
        }
        blockquote { 
            border-left: 4px solid ${colors.link}; 
            margin: 1em 0; 
            padding: 1em 1.5em; 
            color: ${colors.textSecondary}; 
            background: ${colors.bgTertiary};
            border-radius: 0 8px 8px 0;
        }
        blockquote p:last-child { margin-bottom: 0; }
        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.25em; }
        .table-scroll-wrapper {
            width: 100%;
            margin: 1em 0;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border: 1px solid ${colors.border};
            border-radius: 8px;
            scrollbar-width: thin;
            scrollbar-color: ${colors.border} ${colors.bgSecondary};
        }
        .table-scroll-wrapper::-webkit-scrollbar { height: 8px; }
        .table-scroll-wrapper::-webkit-scrollbar-track { background: ${colors.bgSecondary}; border-radius: 4px; }
        .table-scroll-wrapper::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
        .table-scroll-wrapper::-webkit-scrollbar-thumb:hover { background: ${colors.textSecondary}; }
        table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            margin: 0;
            border: none;
        }
        th, td {
            border-bottom: 1px solid ${colors.border};
            padding: 0.75em 1em;
            text-align: left;
            white-space: nowrap;
            min-width: 80px;
        }
        td:last-child { white-space: normal; min-width: 120px; max-width: 360px; }
        th { background: ${colors.bgTertiary}; font-weight: 600; }
        tr:last-child td { border-bottom: none; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        a { color: ${colors.link}; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { 
            margin: 2em 0; 
            border: none; 
            height: 1px; 
            background: ${colors.border}; 
        }
        .katex-display { margin: 1em 0; overflow-x: auto; }
        .mermaid { text-align: center; margin: 1em 0; }
        input[type="checkbox"] { margin-right: 0.5em; }
    </style>
</head>
<body>
${htmlContent}
<script>
document.querySelectorAll('table').forEach(function(table) {
    if (table.parentElement && table.parentElement.classList.contains('table-scroll-wrapper')) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'table-scroll-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
});
</script>
</body>
</html>`;

        const htmlFileName = currentFileName.replace(/\.(md|markdown)$/i, '.html');

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: htmlFileName,
                    types: [{
                        description: 'HTML Files',
                        accept: { 'text/html': ['.html'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(fullHTML);
                await writable.close();

                showToast(`已導出 ${handle.name}`, 'success');
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, htmlFileName);
        showToast(`已導出 ${htmlFileName}`, 'success');
    }

    async function exportAsPDF() {
        if (typeof html2pdf === 'undefined') {
            showToast('PDF 導出功能未載入，請重新整理頁面', 'error');
            return;
        }

        showToast('正在生成 PDF...', 'info');

        // Get theme-specific colors
        const isDark = currentTheme === 'dark';
        const colors = isDark ? {
            bg: '#0d1117',
            bgSecondary: '#161b22',
            bgTertiary: '#21262d',
            text: '#e6edf3',
            textSecondary: '#8b949e',
            border: '#30363d',
            link: '#58a6ff',
            codeText: '#d29922'
        } : {
            bg: '#ffffff',
            bgSecondary: '#f6f8fa',
            bgTertiary: '#eaeef2',
            text: '#1f2328',
            textSecondary: '#656d76',
            border: '#d0d7de',
            link: '#0969da',
            codeText: '#bf8700'
        };

        // Create a temporary container for PDF generation
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderMarkdownWithMath(editorTextarea.value);
        // For PDF, unwrap scroll wrappers and allow normal table flow
        wrapTablesWithScrollContainer(tempDiv);
        tempDiv.querySelectorAll('.table-scroll-wrapper').forEach(w => {
            w.style.overflow = 'visible';
            w.style.border = 'none';
        });
        tempDiv.querySelectorAll('table th, table td').forEach(cell => {
            cell.style.whiteSpace = 'normal';
        });
        tempDiv.style.cssText = `
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
            line-height: 1.6;
            color: ${colors.text};
            background: ${colors.bg};
            padding: 24px;
        `;

        // Add print-friendly styles with theme colors
        const style = document.createElement('style');
        style.textContent = `
            * { color: ${colors.text}; }
            h1, h2, h3, h4, h5, h6 { 
                margin-top: 1.5em; 
                margin-bottom: 0.5em; 
                page-break-after: avoid;
                font-weight: 600;
            }
            h1 { font-size: 24pt; border-bottom: 1px solid ${colors.border}; padding-bottom: 8pt; }
            h2 { font-size: 18pt; border-bottom: 1px solid ${colors.border}; padding-bottom: 6pt; }
            h3 { font-size: 14pt; }
            h4 { font-size: 12pt; }
            p { margin-bottom: 0.75em; }
            pre { 
                background: ${colors.bgSecondary}; 
                padding: 12pt; 
                border-radius: 6pt; 
                overflow-x: auto; 
                page-break-inside: avoid;
                border: 1px solid ${colors.border};
            }
            code { 
                font-family: 'JetBrains Mono', Consolas, monospace; 
                font-size: 9pt; 
            }
            :not(pre) > code {
                background: ${colors.bgTertiary};
                padding: 2pt 4pt;
                border-radius: 4pt;
                color: ${colors.codeText};
            }
            pre code {
                color: ${colors.text};
                background: transparent;
            }
            table { 
                border-collapse: collapse; 
                width: 100%; 
                margin: 12pt 0; 
                page-break-inside: avoid;
                border: 1px solid ${colors.border};
            }
            th, td { 
                border-bottom: 1px solid ${colors.border}; 
                padding: 6pt 10pt; 
            }
            th { background: ${colors.bgTertiary}; font-weight: 600; }
            blockquote { 
                border-left: 4px solid ${colors.link}; 
                padding: 10pt 16pt; 
                margin: 12pt 0; 
                background: ${colors.bgTertiary};
                color: ${colors.textSecondary};
                border-radius: 0 6pt 6pt 0;
            }
            img { max-width: 100%; page-break-inside: avoid; border-radius: 6pt; }
            a { color: ${colors.link}; }
            hr { border: none; height: 1px; background: ${colors.border}; margin: 1.5em 0; }
            ul, ol { padding-left: 24pt; margin-bottom: 0.75em; }
            li { margin-bottom: 4pt; }
        `;
        tempDiv.appendChild(style);
        document.body.appendChild(tempDiv);

        // Wait for Mermaid diagrams to fully render
        await renderMermaidAndWait(tempDiv);

        // Scale Mermaid SVGs to fit within page width (680px - 48px padding = 632px)
        scaleMermaidSVGs(tempDiv, 632);

        const pdfFileName = currentFileName.replace(/\.(md|markdown|txt)$/i, '.pdf');

        const options = {
            margin: [15, 15, 15, 15],
            filename: pdfFileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: colors.bg },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        try {
            // Generate PDF as blob instead of direct save
            const pdfBlob = await html2pdf().set(options).from(tempDiv).outputPdf('blob');
            
            // Try using File System Access API for save dialog
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: pdfFileName,
                        types: [{
                            description: 'PDF Files',
                            accept: { 'application/pdf': ['.pdf'] }
                        }]
                    });

                    const writable = await handle.createWritable();
                    await writable.write(pdfBlob);
                    await writable.close();

                    showToast(`已導出 ${handle.name}`, 'success');
                } catch (err) {
                    if (err.name === 'AbortError') {
                        // User cancelled - do nothing
                    } else {
                        // Fallback to download
                        downloadBlob(pdfBlob, pdfFileName);
                        showToast(`已導出 ${pdfFileName}`, 'success');
                    }
                }
            } else {
                // Fallback to download for browsers without File System Access API
                downloadBlob(pdfBlob, pdfFileName);
                showToast(`已導出 ${pdfFileName}`, 'success');
            }
        } catch (err) {
            console.error('PDF export error:', err);
            showToast('PDF 導出失敗', 'error');
        } finally {
            document.body.removeChild(tempDiv);
        }
    }

    function downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // ========================================
    // Print
    // ========================================

    function printDocument() {
        // Make sure full preview is rendered
        renderFullPreview();

        // Small delay to let rendering complete
        setTimeout(() => {
            window.print();
        }, 100);
    }

    // ========================================
    // Dropdown
    // ========================================

    function toggleExportDropdown(e) {
        e.stopPropagation();
        exportDropdown.classList.toggle('open');
    }

    // ========================================
    // UI State Management
    // ========================================

    function updateUIState() {
        // Enable/disable buttons based on content state
        saveBtn.disabled = !hasContent;
        exportBtn.disabled = !hasContent;
        searchBtn.disabled = !hasContent;
        printBtn.disabled = !hasContent;
        tocToggleBtn.disabled = !hasContent;

        updateUndoRedoButtons();

        // Update file info
        fileNameEl.textContent = currentFileName;
        fileInfoBar.hidden = !hasContent;
        wordCountEl.hidden = !hasContent;

        updateFileStatus();

        // Update page title
        const titlePrefix = isModified ? '● ' : '';
        document.title = hasContent
            ? `${titlePrefix}${currentFileName} - Markdown Editor`
            : 'Markdown Editor';
    }

    function updateFileStatus() {
        if (isModified) {
            fileStatusEl.textContent = '已修改';
            fileStatusEl.classList.add('modified');
        } else {
            fileStatusEl.textContent = '';
            fileStatusEl.classList.remove('modified');
        }

        // Update page title
        const titlePrefix = isModified ? '● ' : '';
        document.title = hasContent
            ? `${titlePrefix}${currentFileName} - Markdown Editor`
            : 'Markdown Editor';
    }

    // ========================================
    // Keyboard Shortcuts
    // ========================================

    function handleKeyboardShortcuts(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    createNewFile();
                    break;
                case 'o':
                    e.preventDefault();
                    fileInput.click();
                    break;
                case 's':
                    e.preventDefault();
                    if (hasContent) saveFile();
                    break;
                case 'e':
                    e.preventDefault();
                    if (hasContent) {
                        setMode(currentMode === 'preview' ? 'edit' : 'preview');
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    if (hasContent) toggleSearchDialog();
                    break;
                case 'p':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        if (hasContent) printDocument();
                    }
                    break;
                case 'z':
                    if (hasContent && currentMode === 'edit') {
                        e.preventDefault();
                        if (e.shiftKey) redo();
                        else undo();
                    }
                    break;
                case 'y':
                    if (hasContent && currentMode === 'edit') {
                        e.preventDefault();
                        redo();
                    }
                    break;
                case 'b':
                    if (hasContent && currentMode === 'edit') {
                        e.preventDefault();
                        saveUndoState();
                        insertFormatting('bold');
                    }
                    break;
                case 'i':
                    if (hasContent && currentMode === 'edit') {
                        e.preventDefault();
                        saveUndoState();
                        insertFormatting('italic');
                    }
                    break;
                case 'k':
                    if (hasContent && currentMode === 'edit') {
                        e.preventDefault();
                        saveUndoState();
                        insertFormatting('link');
                    }
                    break;
            }
        }

        // Escape to switch to preview mode or close dialogs
        if (e.key === 'Escape') {
            if (!searchDialog.hidden) {
                closeSearchDialog();
            } else if (!tocSidebar.hidden) {
                closeTOC();
            } else if (currentMode === 'edit') {
                setMode('preview');
            }
        }
    }

    // ========================================
    // Toast Notifications
    // ========================================

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        };

        const colors = {
            success: { bg: 'rgba(35, 134, 54, 0.15)', border: '#238636', text: '#3fb950' },
            error: { bg: 'rgba(248, 81, 73, 0.15)', border: '#f85149', text: '#f85149' },
            info: { bg: 'rgba(88, 166, 255, 0.15)', border: '#58a6ff', text: '#58a6ff' }
        };

        const color = colors[type] || colors.info;

        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            background: ${color.bg};
            border: 1px solid ${color.border};
            border-radius: 8px;
            color: ${color.text};
            font-size: 0.9rem;
            z-index: 1000;
            animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        `;

        const svg = toast.querySelector('svg');
        svg.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0;';

        document.body.appendChild(toast);

        // Add animation keyframes if not exists
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => toast.remove(), 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // Start Application
    // ========================================

    init();
});
