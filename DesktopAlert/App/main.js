const {app,Tray,Notification,Menu,MenuItem} = require('electron')
const signalR = require('@microsoft/signalr')
const path = require("path");
const yourNegotiatorFunctionUrl="";
const connection = new signalR.HubConnectionBuilder()
  .withUrl(yourNegotiatorFunctionUrl)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Debug)
  .build()

let appIcon;
const iconPath = path.join(__dirname,'/img/icon.png');
app.whenReady().then(()=>{
  app.dock.hide();
  appIcon = new Tray(iconPath)
  const menu = new Menu()
  menu.append(new MenuItem({ role: 'quit',label:'Quit Toilet Keeper' }));
  appIcon.setToolTip('Toilet Keeper')
  appIcon.setContextMenu(menu);
  appIcon.setImage(iconPath)
  connection.start().catch(console.error)
})

connection.on('alert',(message)=>{
  const notification = new Notification({title:'Alert!!!',body:'The toilet lid is opened! You will be punished!'})
  notification.show();
})
