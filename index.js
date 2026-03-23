import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

const extensionName = "ST-Chat-Organizer";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

console.log(`[${extensionName}] Script loaded, waiting for DOM...`);

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
    chatImages: {},
    folderImages: {},
    folderSettings: {},
    folderBgImages: {},
    folderOpacity: {},
    chatBorderRadius: 8,
    chatBorderWidth: 0,
    chatBorderColor: "#444444",
    chatBorderStyle: "solid"
};

function loadSettings() {
    console.log(`[${extensionName}] Loading settings...`);
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
    const $co_enabled = $("#co_enabled");
    if ($co_enabled.length) {
        $co_enabled.prop("checked", s.enabled);
    }
    $("#co_border_color").val(s.borderColor);
    $("#co_folder_bg").val(s.folderBg);
    $("#co_bg_opacity").val(s.bgOpacity);
    $("#co_bg_opacity_val").text(s.bgOpacity + "%");
    $("#co_accent_color").val(s.accentColor);
    $("#co_note_color").val(s.noteColor);
    $("#co-chat-border-radius").val(s.chatBorderRadius ?? 8);
    $("#co-chat-border-radius-val").text((s.chatBorderRadius ?? 8) + "px");
    $("#co-chat-border-width").val(s.chatBorderWidth ?? 0);
    $("#co-chat-border-width-val").text((s.chatBorderWidth ?? 0) + "px");
    $("#co-chat-border-color").val(s.chatBorderColor ?? "#444444");
    $("#co-chat-border-style").val(s.chatBorderStyle ?? "solid");
    applyColors();
    console.log(`[${extensionName}] Settings loaded, enabled: ${s.enabled}`);
}

function hexToRgb(hex) {
    if (!hex || hex === "") return "0,0,0";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function applyColors() {
    const s = extension_settings[extensionName];
    if (!s) return;
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
        .co-actions-menu-btn:hover { background: ${s.noteColor} !important; color: #000 !important; }
        .co-context-menu-item:hover { background: ${accentBg} !important; }
    `;
    $("#co-custom-style").remove();
    $("head").append(`<style id="co-custom-style">${style}</style>`);
    
    updateChatBorders();
}

function updateChatBorders() {
    const s = extension_settings[extensionName];
    const borderRadius = s.chatBorderRadius ?? 8;
    const borderWidth = s.chatBorderWidth ?? 0;
    const borderColor = s.chatBorderColor ?? "#444444";
    const borderStyle = s.chatBorderStyle ?? "solid";
    
    let borderStyleStr = "";
    if (borderWidth > 0) {
        borderStyleStr = `border: ${borderWidth}px ${borderStyle} ${borderColor} !important; border-radius: ${borderRadius}px !important;`;
    } else {
        borderStyleStr = `border: none !important; border-radius: ${borderRadius}px !important;`;
    }
    
    const style = `
        #co-folder-view .recentChat {
            ${borderStyleStr}
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        }
        #co-folder-view .recentChat:hover {
            ${borderWidth > 0 ? `border-color: var(--co-note-color, #f0c060) !important;` : ''}
        }
    `;
    
    $("#co-chat-border-style-dynamic").remove();
    $("head").append(`<style id="co-chat-border-style-dynamic">${style}</style>`);
    
    console.log(`[${extensionName}] Chat borders: radius=${borderRadius}px, width=${borderWidth}px`);
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
function saveFolderImage(charName, url) {
    if (!extension_settings[extensionName].folderImages) extension_settings[extensionName].folderImages = {};
    extension_settings[extensionName].folderImages[charName] = url;
    saveSettingsDebounced();
}
function saveFolderSettings(charName, settings) {
    if (!extension_settings[extensionName].folderSettings) extension_settings[extensionName].folderSettings = {};
    extension_settings[extensionName].folderSettings[charName] = settings;
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
                if (typeof toastr !== 'undefined') {
                    toastr.success("Настройки успешно импортированы!", "Chat Organizer");
                }
            } catch(err) {
                if (typeof toastr !== 'undefined') {
                    toastr.error("Ошибка чтения файла!", "Chat Organizer");
                }
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
            if (node.nodeType === 1 && node.classList) { 
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
            $(this).find(".co-tags-preview, .co-note-preview, .co-actions-menu-btn, .co-actions-context-menu, .co-stats-inline, .co-chat-custom-image").remove();
        }
    });
    $("#co-folder-view").remove();
    $(".recentChatList").show();
}

function showContextMenu(chatElement, chatData) {
    const existingMenu = $(".co-actions-context-menu");
    if (existingMenu.length) {
        existingMenu.remove();
        return;
    }

    const s = extension_settings[extensionName];
    const note = s.notes?.[chatData.dataFile] || "";
    const tagsStr = s.tags?.[chatData.dataFile] || "";
    const isPinned = s.pinned?.[chatData.dataFile];
    const displayName = s.chatNames?.[chatData.dataFile] || chatData.originalName;

    const menu = $(`
        <div class="co-actions-context-menu">
            <div class="co-context-menu-item" data-action="rename">
                <i class="fa-solid fa-pen"></i> <span>Переименовать</span>
            </div>
            <div class="co-context-menu-item" data-action="tag">
                <i class="fa-solid fa-tags"></i> <span>Теги</span>
            </div>
            <div class="co-context-menu-item" data-action="note">
                <i class="fa-solid ${note ? 'fa-note-sticky' : 'fa-plus'}"></i> <span>Заметка</span>
            </div>
            <div class="co-context-menu-divider"></div>
            <div class="co-context-menu-item" data-action="pin">
                <i class="fa-solid fa-thumbtack"></i> <span>${isPinned ? 'Открепить' : 'Закрепить'}</span>
            </div>
            <div class="co-context-menu-divider"></div>
            <div class="co-context-menu-item" data-action="native-rename">
                <i class="fa-solid fa-file-signature"></i> <span>Системное имя</span>
            </div>
            <div class="co-context-menu-item" data-action="delete">
                <i class="fa-solid fa-trash"></i> <span>Удалить чат</span>
            </div>
        </div>
    `);

    $("body").append(menu);
    
    const btn = chatElement.find(".co-actions-menu-btn");
    const btnRect = btn[0].getBoundingClientRect();
    menu.css({
        position: 'fixed',
        top: btnRect.top - 10,
        right: window.innerWidth - btnRect.left + 10,
        transform: 'translateY(-100%)'
    });
    
    menu.addClass("show");

    const closeMenu = (e) => {
        if (!menu.is(e.target) && !menu.has(e.target).length && !$(e.target).closest(".co-actions-menu-btn").length) {
            menu.remove();
            $(document).off("click", closeMenu);
            $(document).off("keydown", escapeHandler);
        }
    };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            menu.remove();
            $(document).off("click", closeMenu);
            $(document).off("keydown", escapeHandler);
        }
    };
    
    setTimeout(() => {
        $(document).on("click", closeMenu);
        $(document).on("keydown", escapeHandler);
    }, 100);

    menu.find("[data-action]").on("click", (e) => {
        e.stopPropagation();
        const action = $(e.currentTarget).data("action");
        
        if (action === "rename") showEditDialog(chatElement, chatData, "rename", displayName);
        else if (action === "tag") showEditDialog(chatElement, chatData, "tag", tagsStr);
        else if (action === "note") showEditDialog(chatElement, chatData, "note", note);
        else if (action === "pin") {
            togglePin(chatData.dataFile);
            buildFolderUI();
        } else if (action === "native-rename") {
            const target = chatData.element.find('.chat_edit, .edit_chat, .ch_edit, [title="Edit chat name"], .chatActions .fa-pen-to-square').first();
            if (target.length) target.click();
            else if (typeof toastr !== 'undefined') toastr.error("Не удалось найти кнопку переименования", "Chat Organizer");
        } else if (action === "delete") {
            const target = chatData.element.find('.delete_chat, .chat_delete, .ch_del, [title="Delete chat"], .chatActions .fa-trash').first();
            if (target.length) target.click();
            else if (typeof toastr !== 'undefined') toastr.error("Не удалось найти кнопку удаления", "Chat Organizer");
        }
        menu.remove();
    });
}

function showEditDialog(chatElement, chatData, type, currentValue) {
    const titles = {
        rename: "Визуальное имя чата",
        tag: "Теги (через запятую)",
        note: "Заметка"
    };
    
    const inputType = type === "note" ? "textarea" : "input";
    const value = (currentValue || "").replace(/"/g, '&quot;');
    
    const modal = $(`
        <div class="co-folder-modal-overlay">
            <div class="co-folder-modal">
                <h3>${titles[type]}</h3>
                ${inputType === "textarea" ? `<textarea id="co-edit-input" placeholder="${titles[type]}..." style="width: 100%; box-sizing: border-box; min-height: 80px;">${value}</textarea>` : `<input type="text" id="co-edit-input" value="${value}" placeholder="${titles[type]}..." style="width: 100%; box-sizing: border-box;">`}
                <div class="co-folder-modal-buttons">
                    <button class="co-modal-cancel">Отмена</button>
                    <button class="co-modal-save">Сохранить</button>
                </div>
            </div>
        </div>
    `);
    
    $("body").append(modal);
    const input = modal.find("#co-edit-input");
    input.focus();
    
    modal.find(".co-modal-cancel").on("click", () => modal.remove());
    modal.find(".co-modal-save").on("click", () => {
        const newValue = input.val();
        
        if (type === "rename") {
            saveChatName(chatData.dataFile, newValue || chatData.originalName);
            chatData.element.find(".chatName span:last-child").text(newValue || chatData.originalName);
        } else if (type === "tag") {
            saveTags(chatData.dataFile, newValue);
            const arr = (newValue || '').split(',').map(t => t.trim()).filter(t => t);
            chatData.element.find(".co-tags-preview").html(arr.map(t => `<span class="co-tag">${t}</span>`).join(''));
        } else if (type === "note") {
            saveNote(chatData.dataFile, newValue);
            const $notePreview = chatData.element.find(".co-note-preview");
            $notePreview.text(newValue || '').toggleClass("co-hidden", !newValue);
        }
        
        modal.remove();
        saveSettingsDebounced();
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadImageFromPC() {
    return new Promise((resolve) => {
        const input = $('<input type="file" accept="image/*" style="display: none;">');
        input.on('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const base64 = await fileToBase64(file);
                resolve(base64);
            } else {
                resolve(null);
            }
            input.remove();
        });
        input.click();
    });
}

function showFolderSettingsModal(charName, currentImage, currentSettings) {
    const s = extension_settings[extensionName];
    const currentBgImage = s.folderBgImages?.[charName] || "";
    const currentHideAvatar = currentSettings?.hideAvatar || false;
    const currentColor = s.folderColors?.[charName] || "";
    const currentOpacity = s.folderOpacity?.[charName] !== undefined ? s.folderOpacity[charName] : (s.bgOpacity ?? 5);
    
    const hasColor = currentColor && currentColor !== "";
    
    const modal = $(`
        <div class="co-folder-modal-overlay">
            <div class="co-folder-modal">
                <h3>Настройки папки: ${charName}</h3>
                
                <label>Фоновое изображение (URL или загрузить с ПК):</label>
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <input type="text" id="co-folder-bg-image" placeholder="https://..." value="${currentBgImage.replace(/"/g, '&quot;')}" style="flex: 1;">
                    <button id="co-upload-bg" class="menu_button" style="padding: 4px 12px;">📁 Загрузить</button>
                    <button id="co-clear-bg" class="menu_button" style="padding: 4px 12px;">✖</button>
                </div>
                <small style="opacity: 0.6; display: block; margin-bottom: 12px;">Картинка будет фоном всей папки</small>
                
                <label>Цвет фона:</label>
                <div class="co-folder-color-row">
                    <input type="color" id="co-folder-color" value="${hasColor ? currentColor : '#000000'}" style="width: 50px; height: 32px;">
                    <button id="co-reset-color" class="menu_button" style="padding: 4px 8px;">Сбросить цвет</button>
                    <button id="co-remove-color" class="menu_button" style="padding: 4px 8px;">Убрать цвет</button>
                </div>
                <small style="opacity: 0.6; display: block; margin-bottom: 12px;">Если убрать цвет - будет только картинка</small>
                
                <label>Прозрачность фона:</label>
                <div class="co-opacity-slider">
                    <input type="range" id="co-folder-opacity" min="0" max="100" value="${currentOpacity}" style="flex: 1;">
                    <span id="co-opacity-value">${currentOpacity}%</span>
                    <button id="co-reset-opacity" class="menu_button" style="padding: 4px 8px;">Сбросить</button>
                </div>
                <small style="opacity: 0.6; display: block; margin-bottom: 12px;">Прозрачность применяется к цвету и картинке</small>
                
                <label>Аватар папки (иконка):</label>
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <input type="text" id="co-folder-avatar-image" placeholder="https://..." value="${(currentImage || '').replace(/"/g, '&quot;')}" style="flex: 1;">
                    <button id="co-upload-avatar" class="menu_button" style="padding: 4px 12px;">📁 Загрузить</button>
                    <button id="co-clear-avatar" class="menu_button" style="padding: 4px 12px;">✖</button>
                </div>
                
                <label style="margin-top: 12px;">
                    <input type="checkbox" id="co-folder-hide-avatar" ${currentHideAvatar ? 'checked' : ''}>
                    Скрыть аватар папки
                </label>
                
                <div class="co-folder-modal-buttons">
                    <button class="co-modal-cancel">Отмена</button>
                    <button class="co-modal-save">Применить</button>
                </div>
            </div>
        </div>
    `);
    
    $("body").append(modal);
    
    const bgImageInput = modal.find("#co-folder-bg-image");
    const avatarImageInput = modal.find("#co-folder-avatar-image");
    const colorInput = modal.find("#co-folder-color");
    const opacitySlider = modal.find("#co-folder-opacity");
    const opacityValue = modal.find("#co-opacity-value");
    
    opacitySlider.on("input", function() {
        opacityValue.text($(this).val() + "%");
    });
    
    modal.find("#co-upload-bg").on("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const base64 = await uploadImageFromPC();
        if (base64) {
            bgImageInput.val(base64);
            if (typeof toastr !== 'undefined') toastr.success("Изображение загружено!", "Chat Organizer");
        }
    });
    
    modal.find("#co-clear-bg").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        bgImageInput.val("");
        if (typeof toastr !== 'undefined') toastr.info("Фоновое изображение удалено", "Chat Organizer");
    });
    
    modal.find("#co-upload-avatar").on("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const base64 = await uploadImageFromPC();
        if (base64) {
            avatarImageInput.val(base64);
            if (typeof toastr !== 'undefined') toastr.success("Аватар загружен!", "Chat Organizer");
        }
    });
    
    modal.find("#co-clear-avatar").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        avatarImageInput.val("");
        if (typeof toastr !== 'undefined') toastr.info("Аватар удален", "Chat Organizer");
    });
    
    modal.find("#co-reset-color").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const globalColor = s.folderBg || "#111111";
        colorInput.val(globalColor);
        if (typeof toastr !== 'undefined') toastr.info("Цвет сброшен к глобальному", "Chat Organizer", { timeOut: 1500 });
    });
    
    modal.find("#co-remove-color").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        colorInput.val("");
        if (typeof toastr !== 'undefined') toastr.info("Цвет убран, будет только картинка", "Chat Organizer", { timeOut: 1500 });
    });
    
    modal.find("#co-reset-opacity").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const defaultOpacity = s.bgOpacity ?? 5;
        opacitySlider.val(defaultOpacity);
        opacityValue.text(defaultOpacity + "%");
        if (typeof toastr !== 'undefined') toastr.info("Прозрачность сброшена к глобальной", "Chat Organizer", { timeOut: 1500 });
    });
    
    modal.find(".co-modal-cancel").on("click", () => modal.remove());
    modal.find(".co-modal-save").on("click", () => {
        const newBgImage = bgImageInput.val();
        const newAvatarImage = avatarImageInput.val();
        const hideAvatar = modal.find("#co-folder-hide-avatar").is(":checked");
        const newColor = colorInput.val();
        const newOpacity = parseInt(opacitySlider.val());
        
        const globalColor = s.folderBg || "#111111";
        const globalOpacity = s.bgOpacity ?? 5;
        
        const isColorEmpty = !newColor || newColor === "";
        const isColorGlobal = newColor === globalColor;
        const isOpacityDefault = newOpacity === globalOpacity;
        
        if (!s.folderBgImages) s.folderBgImages = {};
        s.folderBgImages[charName] = newBgImage;
        
        if (!s.folderColors) s.folderColors = {};
        if (isColorEmpty) {
            delete s.folderColors[charName];
        } else if (isColorGlobal) {
            delete s.folderColors[charName];
        } else {
            s.folderColors[charName] = newColor;
        }
        
        if (!s.folderOpacity) s.folderOpacity = {};
        if (isOpacityDefault) {
            delete s.folderOpacity[charName];
        } else {
            s.folderOpacity[charName] = newOpacity;
        }
        
        saveFolderImage(charName, newAvatarImage);
        saveFolderSettings(charName, { hideAvatar });
        
        modal.remove();
        buildFolderUI();
        
        if (typeof toastr !== 'undefined') {
            if (isColorEmpty) {
                toastr.success("Цвет убран, используется только картинка", "Chat Organizer");
            } else if (isColorGlobal && isOpacityDefault) {
                toastr.success("Настройки сброшены к глобальным", "Chat Organizer");
            } else {
                toastr.success("Настройки сохранены", "Chat Organizer");
            }
        }
    });
}

function buildFolderUI() {
    if (isBuilding) return; 
    isBuilding = true;
    
    removeFolderUI();

    let attempts = 0;
    const tryBuild = () => {
        attempts++;
        if ($(".recentChatList .recentChat").length === 0 && attempts < 15) {
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
                const folderImg = s.folderImages?.[charName] || existingImg;
                const folderSettings = s.folderSettings?.[charName] || {};
                const hideAvatar = folderSettings.hideAvatar || false;
                
                const sortMode = s.folderSort?.[charName] || 'custom';
                const sortIcon = sortMode === 'alpha' ? 'fa-font' : sortMode === 'date' ? 'fa-calendar' : 'fa-sort';
                const sortTitle = sortMode === 'alpha' ? 'По алфавиту' : sortMode === 'date' ? 'По дате' : 'Свой порядок';

                const folderColor = s.folderColors?.[charName];
                const hasColor = folderColor && folderColor !== "";
                const folderOpacityValue = s.folderOpacity?.[charName] !== undefined ? s.folderOpacity[charName] : (s.bgOpacity ?? 5);
                const opacity = folderOpacityValue / 100;
                
                let fBg;
                if (hasColor) {
                    const rgb = hexToRgb(folderColor);
                    fBg = `rgba(${rgb},${opacity})`;
                } else {
                    fBg = `rgba(0,0,0,0)`;
                }
                
                const fBorder = s.folderColors?.[charName] ? folderColor : s.borderColor;

                const folderBgImage = s.folderBgImages?.[charName] || "";

                const $folder = $(`
                    <div class="co-folder" style="border-color: ${fBorder} !important; background: ${fBg} !important; position: relative; overflow: hidden;">
                        ${folderBgImage ? `<div class="co-folder-bg-image" style="background-image: url('${folderBgImage}');"></div>` : ''}
                        <div class="co-folder-header" style="position: relative; z-index: 1;">
                            <img class="co-folder-avatar" src="${hideAvatar ? '' : folderImg}" alt="${charName.replace(/</g, '&lt;')}" style="border-color: ${fBorder} !important; ${hideAvatar ? 'display: none;' : ''}">
                            <span class="co-folder-name">${charName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <span class="co-folder-count">${count}</span>
                            <div class="co-folder-controls">
                                <i class="fa-solid ${sortIcon} co-sort-btn" title="Сортировка: ${sortTitle}"></i>
                                <i class="fa-solid fa-gear co-folder-settings-btn" title="Настройки папки"></i>
                                <div class="co-folder-arrow fa-solid fa-chevron-down"></div>
                            </div>
                        </div>
                        <div class="co-folder-chats" style="border-top-color: ${fBorder} !important; position: relative; z-index: 1;"></div>
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
                
                $folder.find(".co-folder-settings-btn").on("click", (e) => {
                    e.stopPropagation();
                    showFolderSettingsModal(charName, folderImg, folderSettings);
                });

                chats.forEach(chat => {
                    const note = s.notes?.[chat.dataFile] || "";
                    const hasNote = note.length > 0;
                    const tagsStr = s.tags?.[chat.dataFile] || "";
                    const chatImgUrl = s.chatImages?.[chat.dataFile] || "";
                    
                    const displayName = s.chatNames?.[chat.dataFile] || chat.originalName;
                    if (displayName !== chat.originalName) chat.element.find(".chatName span:last-child").text(displayName);

                    const $wrapper = $(`<div class="co-chat-wrapper" draggable="true" data-file="${chat.dataFile}"></div>`);
                    const $checkbox = $(`<input type="checkbox" class="co-bulk-checkbox" value="${chat.dataFile}" />`);
                    $wrapper.append($checkbox);

                    chat.element.detach().appendTo($wrapper);
                    chat.element.find(".co-tags-preview, .co-note-preview, .co-actions-menu-btn, .co-actions-context-menu, .co-stats-inline, .co-chat-custom-image").remove();

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
                        }
                    }

                    const statsHtml = `<span class="co-msg-count" title="Сообщения"><i class="fa-solid fa-message"></i> ${msgCountStr}</span>` + 
                                      (fileSizeStr ? `<span class="co-file-size" title="Размер"><i class="fa-solid fa-hard-drive"></i> ${fileSizeStr}</span>` : "");
                    chat.element.find(".chatDate").append(`<div class="co-stats-inline">${statsHtml}</div>`);

                    const tagsArr = tagsStr.split(',').map(t => t.trim()).filter(t => t);
                    const tagsHtml = tagsArr.map(t => `<span class="co-tag">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('');
                    const $tagsPreview = $(`<div class="co-tags-preview">${tagsHtml}</div>`);
                    const $notePreview = $(`<div class="co-note-preview ${hasNote ? '' : 'co-hidden'}">${hasNote ? note.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>`);
                    
                    const $chatImage = $(`<img class="co-chat-custom-image ${chatImgUrl ? '' : 'co-hidden'}" src="${chatImgUrl}" />`);
                    $chatImage.on("error", function() { $(this).addClass("co-hidden"); });

                    chat.element.find(".recentChatInfo").append($tagsPreview).append($notePreview);
                    chat.element.append($chatImage);

                    const $actionsMenuBtn = $(`
                        <div class="co-actions-menu-btn" title="Действия">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </div>
                    `);
                    
                    chat.element.append($actionsMenuBtn);
                    
                    $actionsMenuBtn.on("click", (e) => {
                        e.stopPropagation();
                        showContextMenu($wrapper, chat);
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
                if (!newTags) {
                    if (typeof toastr !== 'undefined') toastr.warning("Введите теги для добавления!", "Chat Organizer");
                    return;
                }
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
                if (typeof toastr !== 'undefined') toastr.success("Теги успешно добавлены!", "Chat Organizer");
                buildFolderUI();
            });

            $bulkPanel.find(".co-bulk-btn-pin").on("click", () => {
                $(".co-bulk-checkbox:checked").each(function() {
                    togglePin($(this).val());
                });
                if (typeof toastr !== 'undefined') toastr.success("Статус закрепления обновлен!", "Chat Organizer");
                buildFolderUI();
            });

            $bulkPanel.find(".co-bulk-btn-delete").on("click", () => {
                $(".co-bulk-checkbox").prop("checked", false).trigger("change");
                $("#co-bulk-tag-input").val("");
            });

            applyColors();
            updateChatBorders();
            console.log(`[${extensionName}] UI built successfully`);
        }
        
        setTimeout(() => { isBuilding = false; }, 100);
    };

    setTimeout(tryBuild, 50);
}

function onRefreshClick() {
    if (extension_settings[extensionName].enabled) {
        buildFolderUI();
        if (typeof toastr !== 'undefined') toastr.success("Папки обновлены!", "Chat Organizer");
    }
}

function init() {
    console.log(`[${extensionName}] Initializing...`);
    
    if (typeof $ === 'undefined') {
        console.log(`[${extensionName}] jQuery not ready, retrying...`);
        setTimeout(init, 100);
        return;
    }
    
    $.get(`${extensionFolderPath}/example.html`)
        .then(settingsHtml => {
            $("#extensions_settings2").append(settingsHtml);
            console.log(`[${extensionName}] Settings HTML loaded`);
            
            $("#co_enabled").on("change", onEnabledChange);
            $("#co_refresh").on("click", onRefreshClick);
            $("#co_border_color, #co_folder_bg, #co_accent_color, #co_note_color").on("input", onColorChange);
            $("#co_bg_opacity").on("input", function() {
                $("#co_bg_opacity_val").text($(this).val() + "%");
                onColorChange();
            });

            loadSettings();
            // Добавьте после loadSettings();
            console.log("Checking border settings elements:");
            console.log("- border-radius:", document.querySelector('#co-chat-border-radius'));
            console.log("- border-width:", document.querySelector('#co-chat-border-width'));
            console.log("- border-color:", document.querySelector('#co-chat-border-color'));
            console.log("- border-style:", document.querySelector('#co-chat-border-style'));
            setupImportExport();

            $("#co-chat-border-radius").on("input", function() {
                const val = $(this).val();
                $("#co-chat-border-radius-val").text(val + "px");
                extension_settings[extensionName].chatBorderRadius = parseInt(val);
                saveSettingsDebounced();
                updateChatBorders();
            });

            $("#co-chat-border-width").on("input", function() {
                const val = $(this).val();
                $("#co-chat-border-width-val").text(val + "px");
                extension_settings[extensionName].chatBorderWidth = parseFloat(val);
                saveSettingsDebounced();
                updateChatBorders();
            });

            $("#co-chat-border-color").on("input", function() {
                extension_settings[extensionName].chatBorderColor = $(this).val();
                saveSettingsDebounced();
                updateChatBorders();
            });

            $("#co-chat-border-style").on("change", function() {
                extension_settings[extensionName].chatBorderStyle = $(this).val();
                saveSettingsDebounced();
                updateChatBorders();
            });

            if (eventSource && event_types?.CHAT_CHANGED) {
                eventSource.on(event_types.CHAT_CHANGED, () => {
                    scheduleRebuild(500);
                });
            }
            
            setTimeout(() => {
                const chatPanel = document.getElementById('rm_chats_tab') || document.body;
                if (chatPanel) chatObserver.observe(chatPanel, { childList: true, subtree: true });
            }, 1000);

            setTimeout(() => { 
                if (extension_settings[extensionName].enabled) {
                    console.log(`[${extensionName}] Building initial UI...`);
                    buildFolderUI();
                }
            }, 1500);
            
            console.log(`[${extensionName}] Ready!`);
        })
        .catch(error => {
            console.error(`[${extensionName}] ❌ Failed to load HTML:`, error);
        });
}

setTimeout(init, 500);