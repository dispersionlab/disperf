// this connects to other max patches running locally. 


const WebSocket = require('ws');
const max = require('max-api')
 
const wss = new WebSocket.Server({ port:  8080 });
 
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    // console.log('received: %s', message);

    let msg = JSON.parse(message)
    max.post(message)
    // filter messages based on which patch they're coming from
    switch(msg.patch){
      
      case "spat":    
        switch(msg.cmd){
          case "roomState":
            max.outlet('localPatches', msg.data)
          break;
    
          default:
          max.post('recieved unhandled message: ', message)
          break;
        }

      default: max.post('\n\nmessage sent either without identifying patch key, or from a patch not yet switch-cased in localCommunication.js')
    }


    max.post(message)
  });
 
  // ws.send('something');
});


max.addHandler('network', (clients)=>{
  max.post(clients)
})
