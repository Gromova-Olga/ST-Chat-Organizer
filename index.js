import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

const extensionName = "ST-Chat-Organizer";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    enabled: true,
    borderColor: "#444444",
    folderBg: "#111111",
    bgOpacity: 5,
    accentColor: "#222222",
    noteColor: "#f0c060",
    notes: {},
    chatNames: {},
    pinned: {},
    tags: {},
    customOrder: {},
    folderColors: {}, 
    folderSort: {},
    chatImages: {} // Хранилище URL картинок
};

function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    Object.keys(defaultSettings).forEach(key => {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = defaultSettings[key];
        }
    });

    const s = extension_settings[extensionName];
    $("#co_enabled").prop("checked", s.enabled);
    $("#co_border_color").val(s.borderColor);
    $("#co_folder_bg").val(s.folderBg);
    $("#co_bg_opacity").val(s.bgOpacity);
    $("#co_bg_opacity_val").text(s.bgOpacity + "%");
    $("#co_accent_color").val(s.accentColor);
    $("#co_note_color").val(s.noteColor);
    applyColors();
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function applyColors() {
    const s = extension_settings[extensionName];
    const opacity = (s.bgOpacity ?? 5) / 100;
    const rgb = hexToRgb(s.folderBg || "#111111");
    const bg = `rgba(${rgb},${opacity})`;
    const accentRgb = hexToRgb(s.accentColor || "#222222");
    const accentBg = `rgba(${accentRgb},0.5)`;

    const style = `
        :root { --co-note-color: ${s.noteColor}; }
        #co-folder-view .co-folder { border-color: ${s.borderColor}; background: ${bg}; }
        #co-folder-view .co-folder-chats { border-top-color: ${s.borderColor}; }
        #co-folder-view .co-folder-header:hover { background: ${accentBg} !important; }
        #co-folder-view .recentChat:hover { background: ${accentBg} !important; }
        #co-folder-view .co-folder-avatar { border-color: ${s.borderColor}; }
    `;
    $("#co-custom-style").remove();
    $("head").append(`<style id="co-custom-style">${style}</style>`);
}

function onEnabledChange(event) {
    extension_settings[extensionName].enabled = Boolean($(event.target).prop("checked"));
    saveSettingsDebounced();
    if (extension_settings[extensionName].enabled) buildFolderUI();
    else removeFolderUI();
}

function onColorChange() {
    extension_settings[extensionName].borderColor = $("#co_border_color").val();
    extension_settings[extensionName].folderBg = $("#co_folder_bg").val();
    extension_settings[extensionName].bgOpacity = parseInt($("#co_bg_opacity").val());
    extension_settings[extensionName].accentColor = $("#co_accent_color").val();
    extension_settings[extensionName].noteColor = $("#co_note_color").val();
    saveSettingsDebounced();
    applyColors();
    buildFolderUI(); 
}

function saveNote(dataFile, text) {
    if (!extension_settings[extensionName].notes) extension_settings[extensionName].notes = {};
    extension_settings[extensionName].notes[dataFile] = text;
    saveSettingsDebounced();
}
function saveChatName(dataFile, name) {
    if (!extension_settings[extensionName].chatNames) extension_settings[extensionName].chatNames = {};
    extension_settings[extensionName].chatNames[dataFile] = name;
    saveSettingsDebounced();
}
function togglePin(dataFile) {
    if (!extension_settings[extensionName].pinned) extension_settings[extensionName].pinned = {};
    extension_settings[extensionName].pinned[dataFile] = !extension_settings[extensionName].pinned[dataFile];
    saveSettingsDebounced();
}
function saveTags(dataFile, tags) {
    if (!extension_settings[extensionName].tags) extension_settings[extensionName].tags = {};
    extension_settings[extensionName].tags[dataFile] = tags;
    saveSettingsDebounced();
}
function saveCustomOrder(charName, order) {
    if (!extension_settings[extensionName].customOrder) extension_settings[extensionName].customOrder = {};
    extension_settings[extensionName].customOrder[charName] = order;
    saveSettingsDebounced();
}
function saveChatImage(dataFile, url) {
    if (!extension_settings[extensionName].chatImages) extension_settings[extensionName].chatImages = {};
    extension_settings[extensionName].chatImages[dataFile] = url;
    saveSettingsDebounced();
}

function getChatsGroupedByCharacter() {
    const chats = [];
    $(".recentChatList .recentChat").each(function(index) {
        const el = $(this);
        const charName = el.find(".characterName").text().trim();
        const dataFile = el.attr("data-file") || "";
        const originalName = el.find(".chatName span:last-child").text().trim();
        if (charName) chats.push({ charName, dataFile, element: el, originalIndex: index, originalName });
    });

    const grouped = {};
    chats.forEach(chat => {
        if (!grouped[chat.charName]) grouped[chat.charName] = [];
        grouped[chat.charName].push(chat);
    });

    const s = extension_settings[extensionName];
    Object.keys(grouped).forEach(charName => {
        const sortMode = s.folderSort?.[charName] || 'custom';
        const order = s.customOrder?.[charName] || [];
        
        grouped[charName].sort((a, b) => {
            const pinA = s.pinned?.[a.dataFile] ? 1 : 0;
            const pinB = s.pinned?.[b.dataFile] ? 1 : 0;
            if (pinA !== pinB) return pinB - pinA; 

            if (sortMode === 'alpha') {
                const nameA = (s.chatNames?.[a.dataFile] || a.originalName).toLowerCase();
                const nameB = (s.chatNames?.[b.dataFile] || b.originalName).toLowerCase();
                return nameA.localeCompare(nameB);
            } else if (sortMode === 'date') {
                return a.originalIndex - b.originalIndex; 
            } else {
                const idxA = order.indexOf(a.dataFile);
                const idxB = order.indexOf(b.dataFile);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.originalIndex - b.originalIndex;
            }
        });
    });

    return grouped;
}

function setupImportExport() {
    $("#co_export").off("click").on("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(extension_settings[extensionName], null, 2));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "chat-organizer-backup.json");
        dl.click();
    });

    $("#co_import_file").off("change").on("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                Object.assign(extension_settings[extensionName], parsed);
                saveSettingsDebounced();
                buildFolderUI();
                applyColors();
                toastr.success("Настройки успешно импортированы!", "Chat Organizer");
            } catch(err) {
                toastr.error("Ошибка чтения файла!", "Chat Organizer");
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });
}

let isBuilding = false;
let rebuildTimeout;

function scheduleRebuild(delay = 100) {
    if (!extension_settings[extensionName]?.enabled || isBuilding) return;
    clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(buildFolderUI, delay);
}

const chatObserver = new MutationObserver((mutations) => {
    if (!extension_settings[extensionName]?.enabled || isBuilding) return;
    let triggered = false;
    for (let m of mutations) {
        for (let node of m.addedNodes) {
            if (node.nodeType === 1) { 
                if (node.classList.contains('recentChat') || 
                    node.classList.contains('recentChatList') || 
                    (node.querySelector && node.querySelector('.recentChat'))) {
                    triggered = true;
                    break;
                }
            }
        }
        if (triggered) break;
    }
    if (triggered) scheduleRebuild(200); 
});

function removeFolderUI() {
    const existingFiles = new Set();
    $(".recentChatList .recentChat").each(function() {
        const file = $(this).attr("data-file");
        if (file) existingFiles.add(file);
    });

    $("#co-folder-view .recentChat").each(function() {
        const file = $(this).attr("data-file");
        if (file && existingFiles.has(file)) {
            $(this).remove(); 
        } else {
            $(this).detach().appendTo(".recentChatList");
            // Очищаем и новый класс картинки
            $(this).find(".co-tags-preview, .co-note-preview, .co-action-panel, .co-stats-inline, .co-chat-custom-image").remove();
        }
    });
    $("#co-folder-view").remove();
    $(".recentChatList").show();
}

function buildFolderUI() {
    if (isBuilding) return; 
    isBuilding = true;
    
    removeFolderUI();

    let attempts = 0;
    const tryBuild = () => {
        attempts++;
        if ($(".recentChatList .recentChat").length === 0 && attempts < 10) {
            setTimeout(tryBuild, 200);
            return;
        }

        if ($(".recentChatList .recentChat").length > 0) {
            const grouped = getChatsGroupedByCharacter();
            if (Object.keys(grouped).length === 0) {
                setTimeout(() => { isBuilding = false; }, 100);
                return;
            }

            const $list = $(".recentChatList");
            const $container = $(`<div id="co-folder-view"></div>`);
            const s = extension_settings[extensionName];

            const $searchContainer = $(`
                <div class="co-search-container">
                    <input type="text" class="co-search-input" placeholder="Поиск (по имени, тегам, заметкам)..." />
                    <i class="fa-solid fa-search co-search-icon"></i>
                </div>
            `);
            $container.append($searchContainer);

            const $bulkPanel = $(`
                <div id="co-bulk-panel" class="co-hidden">
                    <span class="co-bulk-count-text">Выбрано: <span id="co-bulk-count">0</span></span>
                    <input type="text" id="co-bulk-tag-input" placeholder="Теги (через запятую)..." />
                    <div class="co-bulk-btn co-bulk-btn-tag" title="Добавить теги"><i class="fa-solid fa-tags"></i></div>
                    <div class="co-bulk-btn co-bulk-btn-pin" title="Закрепить/Открепить"><i class="fa-solid fa-thumbtack"></i></div>
                    <div class="co-bulk-btn co-bulk-btn-delete" title="Снять выделение"><i class="fa-solid fa-times"></i></div>
                </div>
            `);
            $container.append($bulkPanel);

            Object.entries(grouped).forEach(([charName, chats]) => {
                const count = chats.length;
                const existingImg = chats[0].element.find("img").attr("src") || "";
                
                const sortMode = s.folderSort?.[charName] || 'custom';
                const sortIcon = sortMode === 'alpha' ? 'fa-font' : sortMode === 'date' ? 'fa-calendar' : 'fa-sort';
                const sortTitle = sortMode === 'alpha' ? 'По алфавиту' : sortMode === 'date' ? 'По дате' : 'Свой порядок';

                const fColorHex = s.folderColors?.[charName] || s.folderBg || "#111111";
                const opacity = (s.bgOpacity ?? 5) / 100;
                const rgb = hexToRgb(fColorHex);
                const fBg = `rgba(${rgb},${opacity})`;
                const fBorder = s.folderColors?.[charName] ? fColorHex : s.borderColor;

                const $folder = $(`
                    <div class="co-folder" style="border-color: ${fBorder} !important; background: ${fBg} !important;">
                        <div class="co-folder-header">
                            <img class="co-folder-avatar" src="${existingImg}" alt="${charName}" style="border-color: ${fBorder} !important;">
                            <span class="co-folder-name">${charName}</span>
                            <span class="co-folder-count">${count}</span>
                            <div class="co-folder-controls">
                                <i class="fa-solid ${sortIcon} co-sort-btn" title="Сортировка: ${sortTitle}"></i>
                                <i class="fa-solid fa-palette co-color-btn" title="Цвет папки"></i>
                                <input type="color" class="co-color-picker co-hidden" value="${fColorHex}">
                                <div class="co-folder-arrow fa-solid fa-chevron-down"></div>
                            </div>
                        </div>
                        <div class="co-folder-chats" style="border-top-color: ${fBorder} !important;"></div>
                    </div>
                `);

                const $chatsContainer = $folder.find(".co-folder-chats");

                $folder.find(".co-sort-btn").on("click", (e) => {
                    e.stopPropagation();
                    const next = sortMode === 'custom' ? 'date' : sortMode === 'date' ? 'alpha' : 'custom';
                    if (!s.folderSort) s.folderSort = {};
                    s.folderSort[charName] = next;
                    saveSettingsDebounced();
                    buildFolderUI();
                });

                $folder.find(".co-color-btn").on("click", (e) => {
                    e.stopPropagation();
                    $folder.find(".co-color-picker").click();
                });

                $folder.find(".co-color-picker").on("input", e => e.stopPropagation()).on("change", function(e) {
                    if (!s.folderColors) s.folderColors = {};
                    s.folderColors[charName] = $(this).val();
                    saveSettingsDebounced();
                    buildFolderUI();
                });

                chats.forEach(chat => {
                    const note = s.notes?.[chat.dataFile] || "";
                    const hasNote = note.length > 0;
                    const isPinned = s.pinned?.[chat.dataFile];
                    const tagsStr = s.tags?.[chat.dataFile] || "";
                    const chatImgUrl = s.chatImages?.[chat.dataFile] || ""; // Ссылка на картинку
                    
                    const displayName = s.chatNames?.[chat.dataFile] || chat.originalName;
                    if (displayName !== chat.originalName) chat.element.find(".chatName span:last-child").text(displayName);

                    const $wrapper = $(`<div class="co-chat-wrapper" draggable="true" data-file="${chat.dataFile}"></div>`);
                    const $checkbox = $(`<input type="checkbox" class="co-bulk-checkbox" value="${chat.dataFile}" />`);
                    $wrapper.append($checkbox);

                    chat.element.detach().appendTo($wrapper);
                    chat.element.find(".co-tags-preview, .co-note-preview, .co-action-panel, .co-stats-inline, .co-chat-custom-image").remove();

                    // Статистика
                    let msgCountStr = "?";
                    let fileSizeStr = "";
                    const $statsBlock = chat.element.find('.chatStats');
                    if ($statsBlock.length > 0) {
                        msgCountStr = $statsBlock.find('.counterBlock small').text().trim() || "?";
                        fileSizeStr = $statsBlock.find('.fileSize').text().trim() || "";
                    } else {
                        const fullText = chat.element.text() || "";
                        const sizeMatch = fullText.match(/([\d.]+\s*[kKmMgG][bB])/i);
                        if (sizeMatch) fileSizeStr = sizeMatch[1];

                        const msgMatch = fullText.match(/(\d+)\s*(?:\||msgs|messages)/i);
                        if (msgMatch) {
                            msgCountStr = msgMatch[1];
                        } else {
                            const titleAttr = chat.element.attr("title") || "";
                            const titleMatch = titleAttr.match(/(\d+)/);
                            if (titleMatch) msgCountStr = titleMatch[1];
                        }
                    }

                    const statsHtml = `<span class="co-msg-count" title="Сообщения"><i class="fa-solid fa-message"></i> ${msgCountStr}</span>` + 
                                      (fileSizeStr ? `<span class="co-file-size" title="Размер"><i class="fa-solid fa-hard-drive"></i> ${fileSizeStr}</span>` : "");
                    chat.element.find(".chatDate").append(`<div class="co-stats-inline">${statsHtml}</div>`);

                    const tagsArr = tagsStr.split(',').map(t => t.trim()).filter(t => t);
                    const tagsHtml = tagsArr.map(t => `<span class="co-tag">${t}</span>`).join('');
                    const $tagsPreview = $(`<div class="co-tags-preview">${tagsHtml}</div>`);
                    const $notePreview = $(`<div class="co-note-preview ${hasNote ? '' : 'co-hidden'}">${hasNote ? note : ''}</div>`);
                    
                    // Блок с кастомной картинкой
                    const $chatImage = $(`<img class="co-chat-custom-image ${chatImgUrl ? '' : 'co-hidden'}" src="${chatImgUrl}" />`);
                    $chatImage.on("error", function() { $(this).addClass("co-hidden"); }); // Скрываем, если ссылка сломана

                    chat.element.find(".recentChatInfo").append($tagsPreview).append($notePreview);
                    chat.element.append($chatImage);

                    const $actionPanel = $(`
                        <div class="co-action-panel">
                            <div class="co-action-btn co-btn-pin ${isPinned ? 'co-active-pin' : ''}" title="Закрепить"><i class="fa-solid fa-thumbtack"></i></div>
                            <div class="co-action-btn co-btn-tag" title="Теги"><i class="fa-solid fa-tags"></i></div>
                            <div class="co-action-btn co-btn-rename" title="Визуальное имя"><i class="fa-solid fa-pen"></i></div>
                            <div class="co-action-btn co-btn-native-rename" title="Системное имя (переименовать файл)"><i class="fa-solid fa-file-signature"></i></div>
                            <div class="co-action-btn co-btn-image ${chatImgUrl ? 'co-active-note' : ''}" title="Обложка чата (URL)"><i class="fa-solid fa-image"></i></div>
                            <div class="co-action-btn co-btn-note ${hasNote ? 'co-active-note' : ''}" title="Заметка"><i class="fa-solid ${hasNote ? 'fa-note-sticky' : 'fa-plus'}"></i></div>
                            <div class="co-action-btn co-btn-trash" title="Удалить чат"><i class="fa-solid fa-trash"></i></div>
                        </div>
                    `);

                    const $editTray = $(`<div class="co-edit-tray co-hidden"></div>`);
                    const $renameArea = $(`<div class="co-edit-section co-hidden"><input type="text" class="co-rename-input" value="${displayName}" placeholder="Визуальное имя чата..." /></div>`);
                    const $tagArea = $(`<div class="co-edit-section co-hidden"><input type="text" class="co-tag-input" value="${tagsStr}" placeholder="Теги (через запятую)..." /></div>`);
                    const $imageArea = $(`<div class="co-edit-section co-hidden"><input type="text" class="co-image-input" value="${chatImgUrl}" placeholder="URL обложки чата (https://...)" /></div>`);
                    const $noteArea = $(`<div class="co-edit-section co-hidden"><textarea class="co-note-input" placeholder="Заметка...">${note}</textarea></div>`);
                    
                    $editTray.append($renameArea, $tagArea, $imageArea, $noteArea);
                    chat.element.append($actionPanel);
                    $wrapper.append($editTray);

                    $actionPanel.find(".co-btn-pin").on("click", (e) => {
                        e.stopPropagation();
                        togglePin(chat.dataFile);
                        buildFolderUI(); 
                    });

                    $actionPanel.find(".co-btn-native-rename").on("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = chat.element.find('.chat_edit, .edit_chat, .ch_edit, [title="Edit chat name"], .chatActions .fa-pen-to-square').first();
                        if (target.length) target.click();
                        else toastr.error("Не удалось найти кнопку переименования", "Chat Organizer");
                    });

                    $actionPanel.find(".co-btn-trash").on("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = chat.element.find('.delete_chat, .chat_delete, .ch_del, [title="Delete chat"], .chatActions .fa-trash').first();
                        if (target.length) target.click();
                        else toastr.error("Не удалось найти кнопку удаления", "Chat Organizer");
                    });

                    function toggleEdit(area) {
                        const isVisible = !area.hasClass("co-hidden");
                        $editTray.find(".co-edit-section").addClass("co-hidden");
                        if (!isVisible) {
                            $editTray.removeClass("co-hidden");
                            area.removeClass("co-hidden");
                            area.find("input, textarea").focus();
                        } else $editTray.addClass("co-hidden");
                    }

                    $actionPanel.find(".co-btn-rename").on("click", (e) => { e.stopPropagation(); toggleEdit($renameArea); });
                    $actionPanel.find(".co-btn-tag").on("click", (e) => { e.stopPropagation(); toggleEdit($tagArea); });
                    $actionPanel.find(".co-btn-image").on("click", (e) => { e.stopPropagation(); toggleEdit($imageArea); });
                    $actionPanel.find(".co-btn-note").on("click", (e) => { e.stopPropagation(); toggleEdit($noteArea); });
                    
                    $editTray.on("click", (e) => e.stopPropagation());

                    $renameArea.find("input").on("blur keydown", function(e) {
                        if (e.type === "keydown" && e.key !== "Enter") return;
                        const val = $(this).val().trim();
                        saveChatName(chat.dataFile, val || chat.originalName);
                        chat.element.find(".chatName span:last-child").text(val || chat.originalName);
                        $(this).val(val || chat.originalName);
                        if (e.type === "keydown") $editTray.addClass("co-hidden");
                    });

                    $tagArea.find("input").on("blur keydown", function(e) {
                        if (e.type === "keydown" && e.key !== "Enter") return;
                        const val = $(this).val();
                        saveTags(chat.dataFile, val);
                        const arr = val.split(',').map(t => t.trim()).filter(t => t);
                        $tagsPreview.html(arr.map(t => `<span class="co-tag">${t}</span>`).join(''));
                        if (e.type === "keydown") $editTray.addClass("co-hidden");
                    });

                    // Сохранение и предпросмотр картинки
                    $imageArea.find("input").on("blur keydown", function(e) {
                        if (e.type === "keydown" && e.key !== "Enter") return;
                        const val = $(this).val().trim();
                        saveChatImage(chat.dataFile, val);
                        if (val) {
                            $chatImage.attr("src", val).removeClass("co-hidden");
                            $actionPanel.find(".co-btn-image").addClass("co-active-note");
                        } else {
                            $chatImage.removeAttr("src").addClass("co-hidden");
                            $actionPanel.find(".co-btn-image").removeClass("co-active-note");
                        }
                        if (e.type === "keydown") $editTray.addClass("co-hidden");
                    });

                    $noteArea.find("textarea").on("input", function() {
                        const val = $(this).val();
                        saveNote(chat.dataFile, val);
                        $notePreview.text(val).toggleClass("co-hidden", val.length === 0);
                        $actionPanel.find(".co-btn-note").toggleClass("co-active-note", val.length > 0)
                            .find("i").attr("class", `fa-solid ${val.length > 0 ? 'fa-note-sticky' : 'fa-plus'}`);
                    });

                    $wrapper.on("dragstart", function(e) {
                        if (sortMode !== 'custom') return e.preventDefault(); 
                        e.originalEvent.dataTransfer.setData("text/plain", chat.dataFile);
                        e.originalEvent.dataTransfer.effectAllowed = "move";
                        $(this).addClass("co-dragging");
                    });
                    $wrapper.on("dragend", function() {
                        $(this).removeClass("co-dragging");
                        $(".co-chat-wrapper").removeClass("co-drag-over");
                    });
                    $wrapper.on("dragover", function(e) {
                        if (sortMode !== 'custom') return;
                        e.preventDefault();
                        e.originalEvent.dataTransfer.dropEffect = "move";
                        $(this).addClass("co-drag-over");
                    });
                    $wrapper.on("dragleave", function() { $(this).removeClass("co-drag-over"); });
                    $wrapper.on("drop", function(e) {
                        if (sortMode !== 'custom') return;
                        e.preventDefault();
                        $(this).removeClass("co-drag-over");
                        const draggedFile = e.originalEvent.dataTransfer.getData("text/plain");
                        const targetFile = chat.dataFile;
                        
                        if (draggedFile && draggedFile !== targetFile) {
                            let order = extension_settings[extensionName].customOrder?.[charName] || [];
                            if (order.length === 0) order = chats.map(c => c.dataFile);
                            if (!order.includes(draggedFile)) order.push(draggedFile);
                            if (!order.includes(targetFile)) order.push(targetFile);

                            const oldIdx = order.indexOf(draggedFile);
                            const newIdx = order.indexOf(targetFile);
                            
                            order.splice(oldIdx, 1);
                            order.splice(newIdx, 0, draggedFile);
                            saveCustomOrder(charName, order);
                            buildFolderUI();
                        }
                    });

                    $chatsContainer.append($wrapper);
                });
                $container.append($folder);
            });

            $list.hide().after($container);

            $("#co-folder-view").on("click", ".co-folder-header", function(e) {
                if (!$(e.target).closest('.co-folder-controls').length) {
                    $(this).closest(".co-folder").toggleClass("co-open");
                }
            });

            $searchContainer.find(".co-search-input").on("input", function() {
                const term = $(this).val().toLowerCase();
                $("#co-folder-view .co-folder").each(function() {
                    let visibleCount = 0;
                    const $folder = $(this);
                    $folder.find(".co-chat-wrapper").each(function() {
                        const $wrap = $(this);
                        const name = $wrap.find(".chatName").text().toLowerCase();
                        const note = $wrap.find(".co-note-preview").text().toLowerCase();
                        const tags = $wrap.find(".co-tags-preview").text().toLowerCase();
                        const char = $folder.find(".co-folder-name").text().toLowerCase();
                        
                        if (name.includes(term) || note.includes(term) || tags.includes(term) || char.includes(term)) {
                            $wrap.show(); visibleCount++;
                        } else $wrap.hide();
                    });
                    if (visibleCount > 0) {
                        $folder.show();
                        if (term.length > 0) $folder.addClass("co-open");
                    } else $folder.hide();
                });
            });

            $container.on("change", ".co-bulk-checkbox", function() {
                const count = $(".co-bulk-checkbox:checked").length;
                if (count > 0) {
                    $bulkPanel.removeClass("co-hidden");
                    $("#co-bulk-count").text(count);
                } else {
                    $bulkPanel.addClass("co-hidden");
                }
            });

            $bulkPanel.find(".co-bulk-btn-tag").on("click", () => {
                const newTags = $("#co-bulk-tag-input").val();
                if (!newTags) return toastr.warning("Введите теги для добавления!", "Chat Organizer");
                $(".co-bulk-checkbox:checked").each(function() {
                    const file = $(this).val();
                    let currentTags = s.tags?.[file] || "";
                    let tagArray = currentTags.split(',').map(t=>t.trim()).filter(t=>t);
                    newTags.split(',').forEach(nt => {
                        nt = nt.trim();
                        if (nt && !tagArray.includes(nt)) tagArray.push(nt);
                    });
                    saveTags(file, tagArray.join(', '));
                });
                toastr.success("Теги успешно добавлены!", "Chat Organizer");
                buildFolderUI();
            });

            $bulkPanel.find(".co-bulk-btn-pin").on("click", () => {
                $(".co-bulk-checkbox:checked").each(function() {
                    togglePin($(this).val());
                });
                toastr.success("Статус закрепления обновлен!", "Chat Organizer");
                buildFolderUI();
            });

            $bulkPanel.find(".co-bulk-btn-delete").on("click", () => {
                $(".co-bulk-checkbox").prop("checked", false).trigger("change");
                $("#co-bulk-tag-input").val("");
            });

            applyColors();
        }
        
        setTimeout(() => { isBuilding = false; }, 100);
    };

    setTimeout(tryBuild, 50);
}

function onRefreshClick() {
    if (extension_settings[extensionName].enabled) {
        buildFolderUI();
        toastr.success("Папки обновлены!", "Chat Organizer");
    }
}

jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);
        $("#co_enabled").on("input", onEnabledChange);
        $("#co_refresh").on("click", onRefreshClick);
        $("#co_border_color, #co_folder_bg, #co_accent_color, #co_note_color").on("input", onColorChange);
        $("#co_bg_opacity").on("input", function() {
            $("#co_bg_opacity_val").text($(this).val() + "%");
            onColorChange();
        });

        loadSettings();
        setupImportExport();

        if (eventSource && event_types?.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
                scheduleRebuild(500);
            });
        }
        
        setTimeout(() => {
            const chatPanel = document.getElementById('rm_chats_tab') || document.body;
            chatObserver.observe(chatPanel, { childList: true, subtree: true });
        }, 1000);

        setTimeout(() => { if (extension_settings[extensionName].enabled) buildFolderUI(); }, 1000);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
