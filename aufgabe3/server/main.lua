local RESOURCE = GetCurrentResourceName()
local SAVE_FILE = 'reports.json'
local ACE = 'report.view'

local COOLDOWN_SECONDS = 60
local TEXT_MIN = 10
local TEXT_MAX = 300

local CATEGORIES = {
    bug      = 'Bug',
    player   = 'Spieler melden',
    question = 'Frage',
    other    = 'Sonstiges'
}

local reports = {}
local nextId = 1
local lastReport = {}

local function getLicense(src)
    for _, identifier in ipairs(GetPlayerIdentifiers(src)) do
        if identifier:sub(1, 8) == 'license:' then
            return identifier
        end
    end
    return nil
end

local function playerKey(src)
    return getLicense(src) or ('src:' .. src)
end

local function isOnline(id)
    for _, player in ipairs(GetPlayers()) do
        if tonumber(player) == id then
            return true
        end
    end
    return false
end

local function findOnlineByLicense(license)
    if not license then return nil end
    for _, player in ipairs(GetPlayers()) do
        if getLicense(player) == license then
            return tonumber(player)
        end
    end
    return nil
end

local function chat(target, message, color)
    TriggerClientEvent('chat:addMessage', target, {
        color = color or { 255, 200, 0 },
        args = { 'Report', message }
    })
end

local function reply(src, ok, message)
    TriggerClientEvent('report_system:result', src, ok, message)
end

local function saveReports()
    local payload = json.encode({ nextId = nextId, reports = reports })
    SaveResourceFile(RESOURCE, SAVE_FILE, payload, -1)
end

local function loadReports()
    local raw = LoadResourceFile(RESOURCE, SAVE_FILE)
    if not raw or raw == '' then return end

    local ok, data = pcall(json.decode, raw)
    if not ok or type(data) ~= 'table' or type(data.reports) ~= 'table' then
        print(('[%s] %s konnte nicht gelesen werden, starte leer.'):format(RESOURCE, SAVE_FILE))
        return
    end

    reports = data.reports
    nextId = tonumber(data.nextId) or 1
    for _, report in ipairs(reports) do
        if report.id >= nextId then
            nextId = report.id + 1
        end
    end
end

local function validate(src, category, text, targetId)
    if type(category) ~= 'string' or not CATEGORIES[category] then
        return nil, 'Ungültige Kategorie.'
    end

    if type(text) ~= 'string' then
        return nil, 'Ungültiger Text.'
    end
    text = text:gsub('%c', ' ')
    text = text:match('^%s*(.-)%s*$')

    local length = utf8.len(text)
    if not length then
        return nil, 'Der Text enthält ungültige Zeichen.'
    end
    if length < TEXT_MIN or length > TEXT_MAX then
        return nil, ('Der Text muss zwischen %d und %d Zeichen lang sein.'):format(TEXT_MIN, TEXT_MAX)
    end

    local target = nil
    if category == 'player' then
        local raw = tostring(targetId)
        if not raw:match('^%d+$') or #raw > 5 then
            return nil, 'Bitte gib eine gültige Server-ID an.'
        end
        target = tonumber(raw)
        if target == src then
            return nil, 'Du kannst dich nicht selbst melden.'
        end
        if not isOnline(target) then
            return nil, ('Der Spieler mit der ID %d ist nicht online.'):format(target)
        end
    end

    return { category = category, text = text, targetId = target }
end

local function remainingCooldown(key)
    local last = lastReport[key]
    if not last then return 0 end
    local left = COOLDOWN_SECONDS - (os.time() - last)
    return left > 0 and left or 0
end

local function notifyStaff(report)
    local message = ('Neuer Report #%d von %s (ID %d): %s. Öffnen mit /reports'):format(
        report.id, report.senderName, report.senderId, CATEGORIES[report.category]
    )
    for _, player in ipairs(GetPlayers()) do
        if IsPlayerAceAllowed(player, ACE) then
            chat(player, message)
        end
    end
end

local function buildOpenList()
    local list = {}
    for _, report in ipairs(reports) do
        if not report.resolved then
            list[#list + 1] = {
                id = report.id,
                senderName = report.senderName,
                senderId = report.senderId,
                category = CATEGORIES[report.category] or report.category,
                text = report.text,
                time = report.time,
                targetId = report.targetId,
                targetName = report.targetName
            }
        end
    end
    return list
end

RegisterNetEvent('report_system:submit', function(category, text, targetId)
    local src = source
    local key = playerKey(src)

    local wait = remainingCooldown(key)
    if wait > 0 then
        reply(src, false, ('Bitte warte noch %d Sekunden, bevor du den nächsten Report sendest.'):format(wait))
        return
    end

    local data, err = validate(src, category, text, targetId)
    if not data then
        reply(src, false, err)
        return
    end

    local report = {
        id = nextId,
        senderName = GetPlayerName(src),
        senderId = src,
        senderLicense = getLicense(src),
        category = data.category,
        text = data.text,
        time = os.date('%d.%m.%Y %H:%M:%S'),
        targetId = data.targetId,
        targetName = data.targetId and GetPlayerName(data.targetId) or nil,
        resolved = false
    }
    nextId = nextId + 1
    reports[#reports + 1] = report
    lastReport[key] = os.time()
    saveReports()

    reply(src, true, ('Dein Report #%d wurde gesendet.'):format(report.id))
    notifyStaff(report)
end)

RegisterNetEvent('report_system:requestList', function()
    local src = source
    if not IsPlayerAceAllowed(src, ACE) then
        chat(src, 'Dazu hast du keine Berechtigung.', { 255, 92, 92 })
        return
    end
    TriggerClientEvent('report_system:showList', src, buildOpenList())
end)

RegisterNetEvent('report_system:resolve', function(id)
    local src = source
    if not IsPlayerAceAllowed(src, ACE) then return end

    id = tonumber(id)
    if not id then return end

    for _, report in ipairs(reports) do
        if report.id == id and not report.resolved then
            report.resolved = true
            report.resolvedBy = GetPlayerName(src)
            saveReports()

            local creator = findOnlineByLicense(report.senderLicense)
            if creator then
                chat(creator, ('Dein Report #%d wurde von %s als erledigt markiert.'):format(report.id, report.resolvedBy), { 95, 214, 138 })
            end
            break
        end
    end

    TriggerClientEvent('report_system:showList', src, buildOpenList())
end)

loadReports()
