const max = require('max-api')

max.addHandler('startInstall', () =>{
    max.outlet("toBackchannel", "script", "npm", "install")
})

max.addHandler('backChannel', (obj)=>{
    // wait for the backchannel to install
    if(obj.args[1] == "--scripts-prepend-node-path=true"){
        max.outlet("toTelematicScript", "script", "npm", "install")  
    }
})

max.addHandler('telematicScript', (obj)=>{
    // wait for the backchannel to install
    if(obj.args[1] == "--scripts-prepend-node-path=true"){
        max.outlet("toLocalCommunication", "script", "npm", "install")  
    }
})