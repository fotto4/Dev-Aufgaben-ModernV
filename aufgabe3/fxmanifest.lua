fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'report_system'
description 'Einfaches Report-System mit NUI (ohne Framework)'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}

client_script 'client/main.lua'
server_script 'server/main.lua'
