const webSocket = require('ws');
const ip = require('ip');
const username = require('username')
const max = require('max-api');
const { exec, execSync, spawn } = require('child_process')
const rws = require('reconnecting-websocket');
const express = require('express')
const _ = require('lodash')
const isReachable = require('is-reachable');

const thisMachine = username.sync()

let pStats = {} // this is really important
let wsStatus = 0;
let networkData;
let peerCount = 0
let peerNames = []

let redundancyCheck = 0;
let brokerHost;

const rwsOptions = {
  WebSocket: webSocket,
  connectionTimeout: 1000
}


// const hookcord = require('hookcord');

// function discord(msg){

//   payload = {
//     content: msg
//   }
//   let Hook = new hookcord.Hook()
//   .setLink('https://discordapp.com/api/webhooks/664564721676189696/6UhiqCWuMNXS-mQ3Mffb4UvQ4BIdDeiIOSe3BbMiYXnQXSVIjiDv04yMEr5-CW_7EuS4')
//   .setPayload(payload)
//   .fire()
//   .then(function(response) {})
//   .catch(function(e) {})
// }


process.env.PATH = [process.env.PATH, "/usr/local/bin"].join(":");
// max.post(__dirname, process.env.PATH, '\n')
// console_jackdmp === 1

// don't delete, just keeping this here for the 2.0 version!
// var graphs = express();
// graphs.use(express.static('graphs'));
// graphs.listen(3000, function () {
// });
// on load, reset local graphs!
// max.outlet('graphs', 'all', 'resetGraph')

// ping the broker host every 30 seconds to verify its still online

max.addHandler('brokerStatus',()=>{
  (async () => {
    // console.log();
    //=> true
      max.outlet('brokerStatus',await isReachable(brokerHost,{timeout: 20000}))
  })();
})

max.outlet('hostname', username.sync())

max.outlet('hostIP', ip.address())

let ws;

function wsConnect(){
  if (process.argv[2] === 'lan'){
    brokerHost = process.argv[3]
    ws = new rws('ws://' + process.argv[3] + ':8080', [], rwsOptions);
  } else if (process.argv[2] === 'localhost'){
    brokerHost = '127.0.0.1'
    ws = new rws('ws://127.0.0.1:8080', [], rwsOptions);
  } else {
    brokerHost = ["http://fathomless-savannah-66140.herokuapp.com/"];
    ws = new rws('ws://fathomless-savannah-66140.herokuapp.com/8080', [], rwsOptions);
  }
}
wsConnect()


setInterval(function runStatus(){
    max.outlet('node.script_active')
  
  }, 2000);
/*
ws.addEventListener('close', (code, reason) =>{
  max.post(code, reason)
  wsStatus = 0
  // wsConnect()
  max.post('websocket client: ', code, reason)
});
*/


ws.addEventListener('open', () =>{
  max.post('websocket client opened')


  wsStatus = 1
  let thisClient = JSON.stringify({
    cmd: 'newClient',
    data: 
      {
        username: thisMachine,
        ip: ip.address()
      },
    date: Date.now() 
  })

  // send message to discord stating telematic patch is connected
  // this is now handled by the broker only!
  // discord(thisMachine + ' has joined the disperf network')
  ws.send(thisClient);
  //process.exit()
});


ws.addEventListener('message', (data) =>{
  
  msg = JSON.parse(data.data)
  cmd = msg.cmd
    //////////// filter messages for just this peer:
  if(msg.target === thisMachine){
    
    switch(cmd){

      case 'serverMsg':
        // max.post(msg.data)
        max.outlet('serverMsg', msg.data)
      break;

      case 'startService':
        // max.post(msg.service, msg.options, msg.target)
        // route service reuests

        let routing = msg.service + '_' + msg.options 
        max.outlet('startService', routing, 1)
        // max.post('startService', routing, 1)
        
      break
      default:
        max.post('unhandled server message targeted @ ' + thisMachine)
    }
  } else {
    //////////// these are messages broadcast to all clients
    switch (cmd){
      // update the local graphs
      // case 'addNode':
      // case 'removeNode':
      //   max.outlet('graphs', 'connections', cmd, msg.data)
      // break;

      case 'ping':
        // ignore: this message is from the heroku app. it is simply to prevent the app from crashing due to connection timeouts
      break
      case 'serverMsg':
        // max.post(msg.data)
        //max.outlet('serverMsg', msg.data)
      break;

      case 'addNode':
      case 'removeNode':
        // this is for the graph (v2.0)
      break
      case 'network':
        // display the total network state in dict.view
        // first check that incoming network data isn't redundant:
        


        // this function will return true after 1 second (see the async keyword in front of function)
        async function checkRedundancy() {
          
          // create a new promise inside of the async function
          let promise = new Promise((resolve, reject) => {
            resolve(_.isEqual(networkData, msg.data))
            networkData = msg.data
          });
          
          // wait for the promise to resolve
          redundancyCheck = await promise;
          
          // console log the result (true)
          // max.post('check', redundancyCheck);

          if (redundancyCheck > 0){
            
          } else {
            //max.outlet('graphs', 'all', 'resetGraph')
            updateLocal()
          }
     
        }

        // call the function
        checkRedundancy();

        function updateLocal(){
            
            // max.post(msg.data)
            
            max.outlet('network', networkData)
          
            // don't delete this, but its just not being implemented for the 1.0 version
            // graphData = msg.data
            // setGraph(graphData)
            
            
          
            //max.outlet('networkTree', JSON.stringify(msg.data))
            // and, for the eventual interactive network tree running at localhost:3000/index.html
            // write it to temp.json
            // fs.writeJson('./networkTree/temp.json', msg.data).then(() => {
            //   max.post('network update')
            //   max.outlet('reload_networkTree')
            // })
            // .catch(err => {
            //   max.post(err)
            // })
            
            // // if # of peers has changed, update peers umenus
            // if(msg.data.peers === null || !msg.data.peers){
            //   // do nothing
            // } else if(msg.data.peers){
            //   if(peerCount < msg.data.peers || peerCount > msg.data.peers){
            //     Object.keys(msg.data).forEach(function(key) {
            //       // ignore the reserved object 'peers'
            //       if (key !== 'peers'){
            //         max.outlet('peers', 'clear')
            //         max.outlet('peers', 'append', 'Choose...')
            //         // fill the iperf2/iperf3 testing umenu & jacktrip umenus with available peers
            //         max.outlet('peers', 'append', key)
            //       }
            //     });
            //   }
            //   // update peerCount after
            //   peerCount = msg.data.peers
            // }
          }

        

        
      break;
      case 'id':
        max.outlet('id', msg.data)
      break;
      default:
        max.post('\n\nFor developer: unhandled message from remote broker: ', msg)
      break

    }
       
  }
 

});

function sendToBroker(msg){
  if(wsStatus === 0){
    max.post('websocket client closed, did not send message:\n\n' + msg)
  } else{
    ws.send(msg)
  }
}


// check process statuses:
max.addHandler('pStats', (pStats) => {
  pStats = pStats
  m = JSON.stringify({
    cmd: 'pStats',
    data: pStats,
    date: Date.now()
  })
  
  // ws.send(jackStatus);
  sendToBroker(m)

})  


// an efficient way to send service status updates
max.addHandler('serviceStatus', (service, mode, status)=>{
  max.post("serviceStatus", service, mode, status)

  foo = JSON.stringify({
    cmd: 'serviceStatus',
    data: [service, mode, status],
    date: Date.now()
  })  
  // ws.send(foo);
  sendToBroker(foo)
})

max.addHandler('iperf3_server', (status) => {
  // to do: push this info into the pStats json instead
  // switch (status){
  //   case 0:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Not Running',
  //       date: Date.now(),
  //     })  
  //     // ws.send(foo);
  //     sendToBroker(foo)
  //   break;

  //   case 1:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Ready', // To do; When a client connects to this iperf3 server, change the status to 'In Use'
  //       date: Date.now(),
  //     }) 
  //     // ws.send(foo); 
  //     sendToBroker(foo)

  //   break;
  // }

  
})

max.addHandler('JTServers', (dictionary) => {
  // max.post(dictionary.local_0)
  // let tempDict = {}
  // JTServers = Object.keys(dictionary)
  // for (i = 0; i < JTServers.length; i++){
    
  // }
      //  foo = JSON.stringify({
      //   cmd: 'JTServers',
      //   data: dictionary,
      //   date: Date.now(),
      // })  
      // // ws.send(foo);
      // sendToBroker(foo)



  // switch (status){
  //   case 0:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Not Running',
  //       date: Date.now(),
  //     })  
  //     ws.send(foo);
  //   break;

  //   case 1:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Ready', // To do; When a client connects to this iperf3 server, change the status to 'In Use'
  //       date: Date.now(),
  //     }) 
  //     ws.send(foo); 
  //   break;
  // }

  
})

// this is a crucial function of this script:::
// use this to ask the signal server to coordinate tests and perhaps other
// things
max.addHandler('request', (service, mode, target) => {
  let request;
  switch(service){

    case 'iperf3':

        request = JSON.stringify({
          cmd: 'request',
          data: [service,mode, target],
          date: Date.now(),
        })  
    break;
  }


      // ws.send(request);
      sendToBroker(request)

  // max.post(dictionary.local_0)
  // let tempDict = {}
  // JTServers = Object.keys(dictionary)
  // for (i = 0; i < JTServers.length; i++){
    
  // }
      //  foo = JSON.stringify({
      //   cmd: 'JTServers',
      //   data: dictionary,
      //   date: Date.now(),
      // })  
      // ws.send(foo);


  // switch (status){
  //   case 0:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Not Running',
  //       date: Date.now(),
  //     })  
  //     ws.send(foo);
  //   break;

  //   case 1:
  //     foo = JSON.stringify({
  //       cmd: 'iperf3_server',
  //       data: 'Ready', // To do; When a client connects to this iperf3 server, change the status to 'In Use'
  //       date: Date.now(),
  //     }) 
  //     ws.send(foo); 
  //   break;
  // }

  
})



// don't delete this, just keeping it out for the 1.0 version
  // max.addHandler('reloadGraph', ()=>{
  //   // setGraph(graphData)
  // })
  // function setGraph(graphData){
  // Object.keys(graphData).forEach(function(key) {
  //   // ignore the reserved object 'peers'
  //   if (key !== 'peers'){

  //     max.outlet('graphs', 'connections addNode ' + key)
  //     // prevent throw error if data not available
  //     //max.post(key)
  //     if(graphData[key].iperf3 !== undefined){
  //       iperf3Version = graphData[key].iperf3.version.split(' ')[1]
  //       max.outlet('graphs', 'connections addNode iperf' + iperf3Version)
  //       max.outlet('graphs', 'connections addLink ' + key + ' iperf' + iperf3Version + ' 2')
  //       // populate based on iperf3 startus:
  //       if(graphData[key].iperf3.server == 'Ready'){
  //         //max.post('iperf2', iperf2Version)
  //         max.outlet('graphs', 'connections addNode iPerf3_server')
  //         max.outlet('graphs', 'connections addLink iperf' + iperf3Version + ' iPerf3_server 1')
  //       }

  //     } else if(graphData[key].iperf2 !== undefined){
  //       iperf2Version = graphData[key].iperf2.version.split(' ')[1]
  //       //max.post('iperf2', iperf2Version)
  //       max.outlet('graphs', 'connections addNode iperf' + iperf2Version)
  //       max.outlet('graphs', 'connections addLink ' + key + ' iperf' + iperf2Version + ' 2')
  //     } else {
  //       max.post(graphdata[key])
  //     }


  //     //max.post(key)
  //   }
  // });
// }

max.addHandler('localPatches', (localPatches) => {
  // max.post(namespace)
  // let bar = {}

  //bar[thisMachine] = namespace
  let outMsg = JSON.stringify({
    date: Date.now(),
    data: localPatches,
    cmd: 'namespace',
    source: thisMachine
  })
  // ws.send(outMsg)
  sendToBroker(outMsg)

})

///////////////////// chat window:
// don't delete this. its just commented out for the 1.0 version
// max.addHandler('clearChatHistory', () =>{
//   ws.send(JSON.stringify({
//     cmd:'clearChatHistory'
//   }))
// })