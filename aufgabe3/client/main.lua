local uiOpen = false
local currentView = nil

local function openUi(view, reports)
    uiOpen = true
    currentView = view
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', view = view, reports = reports })
end

local function closeUi()
    uiOpen = false
    currentView = nil
    SetNuiFocus(false, false)
end

local function chat(message)
    TriggerEvent('chat:addMessage', { color = { 255, 200, 0 }, args = { 'Report', message } })
end

RegisterCommand('report', function()
    if uiOpen then return end
    openUi('form')
end, false)

RegisterCommand('reports', function()
    if uiOpen then return end
    TriggerServerEvent('report_system:requestList')
end, false)

RegisterNUICallback('close', function(_, cb)
    closeUi()
    cb({ ok = true })
end)

RegisterNUICallback('submit', function(data, cb)
    if not uiOpen or type(data) ~= 'table' then
        cb({ ok = false })
        return
    end
    TriggerServerEvent('report_system:submit', data.category, data.text, data.targetId)
    cb({ ok = true })
end)

RegisterNUICallback('resolve', function(data, cb)
    if not uiOpen or type(data) ~= 'table' then
        cb({ ok = false })
        return
    end
    TriggerServerEvent('report_system:resolve', data.id)
    cb({ ok = true })
end)

RegisterNetEvent('report_system:result', function(ok, message)
    if uiOpen then
        SendNUIMessage({ action = 'result', ok = ok, message = message })
    else
        chat(message)
    end
end)

RegisterNetEvent('report_system:showList', function(reports)
    if not uiOpen then
        openUi('list', reports)
    elseif currentView == 'list' then
        SendNUIMessage({ action = 'list', reports = reports })
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        SetNuiFocus(false, false)
    end
end)
