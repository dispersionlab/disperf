// dependencies:
const { exec, execSync, spawn } = require('child_process')
const path = require("path");
const max = require('max-api');
const find = require('find-process');
const moment = require('moment')
const bytesToX = require('bytes-to-x')
const applescript = require('applescript')
const clipboardy = require('clipboardy')
const isReachable = require('is-reachable');
const fs = require('fs')


let startingBandwidth;
let backchannelPID;

let disperfTests = {}
// stability:
// the max patch listens for this every 5 seconds. 
// if it doesn't receive an update it assumes this 
// script has failed to start/run.
// and so it restarts (see the max code)

setInterval(function runStatus(){
  max.outlet('node.script_active')
}, 5000);

/////////////////////////////////////////

// checkJack()
// all locations stored at:
let nodes = {}

// ensure no current iperf3 sesions running:
find('name', 'iperf3', true)
  .then(function (list) {
    //max.post('there are ' + list.length + ' iperf3 process(es) running, now killing...');
    
    if (list.length > 0){
      execSync('killall iperf3')
    }
  });
/////////////////////////////////////

max.outlets = 6

process.env.PATH = [process.env.PATH, "/usr/local/bin"].join(":");

//var disperfDict = new Dict("disperf")
// This will be printed directly to the Max console
max.post(`Loaded the ${path.basename(__filename)} script`);


// the broker.js script is hosted at this url
var brokerHost = ["http://fathomless-savannah-66140.herokuapp.com/"];

// if client switched to a local or other broker host, update that here:
max.addHandler('brokerHost', (hostIP)=>{
  // if client switched back to heroku app, then reset it
  if(hostIP === 'heroku'){
    brokerHost = ["http://fathomless-savannah-66140.herokuapp.com/"];
  } else {
    brokerHost = hostIP

  }
})
// check online status of the connections broker. if its online, start the backchannel script
function brokerCheck(){
  (async () => {
    // console.log();
    //=> true
      max.outlet('is-online',await isReachable(brokerHost,{timeout: 5000}))
  })();
}
// run the broker check
brokerCheck()

// the maxpatch pings the brokerCheck twice per minute
max.addHandler('brokerIsOnline',()=>{
  brokerCheck()
})


// monitor the status of the backchannel script:
// eventually do more with this ... 
max.addHandler('backchannelStatus', (dictionary)=>{
  backchannelPID = dictionary
  max.post('backchannel process id: ', backchannelPID)
})





// start/open jackpilot
max.addHandler("jackpilot", () => {
    exec('open -a JackPilot')
    max.post("opening jackpilot");
});

// start/open qjackctl
max.addHandler("qjackctl", () => {
  exec('open -a qjackctl')
  max.post("opening jackpilot");
});

/////////////////// latency

max.addHandler('ping', (pingOptions)=>{
  
  max.post(pingOptions)
  
  // exec('ping ' + ip, (stdout,stderr,err) =>{
  //   max.post(stdout,stderr,err)
  // })

  let parameters = ['-c', pingOptions.count, '-i', pingOptions.interval, pingOptions.ip ];
  const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  };
  ping = spawn('ping',parameters, options, {detached: true});
  pingPID = Math.abs(-ping.pid) 
  max.post(pingPID)
  ping.stdout.on('data', (data) => {
    max.post(`stdout: ${data}`);
    max.outlet('ping',`ping: ${data}`)
    //send_log(data.toString(),msg.data.tab)
  });
  
  ping.stderr.on('data', (data) => {
     max.post(`stderr: ${data}`);
     max.outlet('ping',`ping: ${data}`)
      //send_log(data.toString(),msg.data.tab)
  });
  ping.on('close', (code) => {
      data = `child process exited with code ${code}`
      max.outlet('ping',`ping: ${data}`)
    //send_log(data.toString(),msg.data.tab)
     max.post(`child process exited with code ${code}`);
     max.outlet('pingClose', 0)
  });

  

})



//////////////////////////////////////// run iperf3 test as client
let maxMadePIDs = []
max.addHandler("iperf3_client", (ip) => {
  max.outlet('iperf3', "set test running...")

	exec('iperf3 -u -c ' + ip + ' -p 5201 -J -b 1M -Z -t 3',(stdout,stderr,err) =>{
    
    max.outlet("iperf3", "set")
    iperf3Result = JSON.parse(stderr)
    max.outlet("refresh disperfDict")
    max.outlet(iperf3Result.start)

    //stderr.end.streams[0].udp
  var endStreams = JSON.stringify(iperf3Result.end.streams[0].udp)

	max.setDict('temp', JSON.parse(stderr))
	//max.outlet('bang')
  max.outlet('jitter', iperf3Result.end.streams[0].udp.jitter_ms)
  max.outlet('loss', iperf3Result.end.streams[0].udp.lost_percent)
  })
});
//////////////////////// host an iperf3 server
let iperf3ServerPID;
max.addHandler("iperf3_server", (runStatus) => {
  max.post('iperf3_server ' + runStatus)

  
 // execSync('killall iperf3')
  if (runStatus === 1){
    //to do add a port flag and variable to this script and max patch
    let parameters = ['-s','-J'];
    const options = {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    };
    iperf3Server = spawn('iperf3',parameters, options, {detached: true});
    iperf3ServerPID = Math.abs(-iperf3Server.pid) 
    max.post(iperf3ServerPID)
    iperf3Server.stdout.on('data', (data) => {
      max.post(`stdout: ${data}`);
      //send_log(data.toString(),msg.data.tab)
    });
    
    iperf3Server.stderr.on('data', (data) => {
       max.post(`stderr: ${data}`);
        //send_log(data.toString(),msg.data.tab)
    });
    iperf3Server.on('close', (code) => {
      data = `child process exited with code ${code}`
      //send_log(data.toString(),msg.data.tab)
       max.post(`child process exited with code ${code}`);
       max.outlet('iperfServerClose', 0)
    });
  } else if (runStatus === 0){
    process.kill(iperf3ServerPID)
    // execSync('killall iperf3')
  }


	//exec('iperf3 -s -J',(stdout,stderr,err) =>{
   // max.outlet("iperf3", "set")
    //max.post(stderr)
   // iperf3Result = JSON.parse(stderr)
   // max.post(iperf3Result)
    //max.outlet("refresh disperfDict")
    //max.outlet(iperf3Result.start)

    //stderr.end.streams[0].udp
	//var endStreams = JSON.stringify(iperf3Result.end.streams[0].udp)
    //max.post(endStreams)
	//max.setDict('iperfServer', JSON.parse(stderr))
	//max.outlet('bang')
  //max.outlet('jitter', iperf3Result.end.streams[0].udp.jitter_ms)
  //max.outlet('loss', iperf3Result.end.streams[0].udp.lost_percent)



	})
//});




max.addHandler("kill", (msg) => {
	exec('kill ' + msg,(stdout,stderr,err) =>{

		max.post(stdout,stderr,err)
	})
});

max.addHandler("endJackTrips",()=>{
  // first check to see if jacktrip(s) is running. this prevents an error where the telematic script will restart if no jacktrip sessions running and an attempt to killall jacktrip is made
  find('name', 'jacktrip', true)
  .then(function (list) {  
    if (list.length > 0){
      execSync('killall jacktrip')
    }
  });
})
// create new jacktrip connection
let activeJacktripConnections = {}
max.addHandler("Jacktrip", (connectionName,offset,channels,queue,redundancy,type,ip) => {

  max.post(connectionName,"offset",offset,"channels",channels,"queue",queue,"redundancy",redundancy,"type",type,"ip",ip);
  //console.log(msg.data)
  // switch (msg.data[2].testType){
  //   case "single test":
  //   console.log( msg.data[0].server.replace(' ', ' -p '))
  //   let serverIP = msg.data[0].server.replace(' ', ' -p ')
  let jtMode;
  let parameters;
  if (type === 'Client'){
    jtMode = '-c ' + ip
    if (offset > 0){
      parameters = [jtMode,'-o',offset, '-n', channels,'-q',queue,'-r',redundancy];    
    } else {
      parameters = [jtMode,'-n',channels,'-q',queue,'-r',redundancy];    
    }
  } else {
    parameters = ['-s','-o',offset, '-n', channels,]
  }
  const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  };
  jacktrip = spawn('jacktrip',parameters, options, {detached: true});
  jacktripPID = -jacktrip.pid
  max.outlet("jacktripID " + jacktripPID)
  maxMadePIDs.push(Math.abs(jacktripPID))
  let newActive = []


  newActive.push({pid:jacktripPID})

  if (type === 'Client'){
    activeJacktripConnections[connectionName] = {ip:ip,offset:offset,channels:channels,queue:queue,redundancy:redundancy,pid:jacktripPID}
  } else {
    // if running a server, we don't need to include the queue or redundancy
    activeJacktripConnections[connectionName] = {ip:ip,offset:offset,channels:channels,pid:jacktripPID}
  }

  
  max.post(activeJacktripConnections)

  max.setDict('activeJacktripConnections', activeJacktripConnections)
  max.outlet(`bangActive`);
  
  jacktrip.stdout.on('data', (data) => {
    max.outlet(`stdout: ${data}`);
    //send_log(data.toString(),msg.data.tab)
  });
  jacktrip.stderr.on('data', (data) => {
      max.outlet(`stderr: ${data}`);
      //send_log(data.toString(),msg.data.tab)
  });
  jacktrip.on('close', (code) => {
    data = `child process exited with code ${code}`
    //send_log(data.toString(),msg.data.tab)
      max.outlet(`child process exited with code ${code}`);
  });
});

// terminate an active jacktrip connection:

max.addHandler("close-Jacktrip", (pid) => {
  process.kill(pid)
})



////////////////////////// disperf3 /////////////////////

let settings = {}

let settingsDB = JSON.parse(fs.readFileSync('./settings/disperfSettings.json'))
max.outlet('disperfSettings', settingsDB.default)
max.addHandler('disperfSettings', (name, setting, value)=>{
  max.setDict('disperfSettings', name);
    settings[setting] = value

    if(settingsDB[name]){
        settingsDB[name][setting] = value
    }else {
        settingsDB[name] = settings
    }

    max.outlet('disperf', settingsDB[name])
    fs.writeFileSync('./settings/disperfSettings.json', JSON.stringify(settingsDB, null, '\t'))
})

let cancel; 
// this is a clunky way to 'cancel' disperf. i didn't write disperf as an async function, so unfortunately just need to check against 
// whether the cancel value is active or not each time we test. again, its clunky. 
max.addHandler('cancelDisperf3', () =>{
  cancel = 'stop'
})

// get the disperf initial settings
max.addHandler('disperfDefault', ()=>{
  max.outlet('disperfSettings', settingsDB.default)
  max.outlet('disperf', settingsDB.default)
})

// if peer has already been tested, get their last-used settings:
max.addHandler('getDisperfSetting', (name)=>{
  if(settingsDB.hasOwnProperty(name)){
    max.outlet('disperfSettings', settingsDB[name])
  } else {
    settingsDB[name] = settingsDB.default
    max.outlet('disperf', settingsDB.default)
    fs.writeFileSync('./settings/disperfSettings.json', JSON.stringify(settingsDB, null, '\t'))

  }
  // max.outlet('disperfPeerSettings')
})

// run disperf!
// max.addHandler('disperf3', (ip, port, increment, incrementDuration, maxError, remoteName, scheduler, repeats, interval, limit, directionality) => {
 
max.addHandler('disperf3', (remoteName) => {
  let test = settingsDB[remoteName]
  let ip = test.ip
  let port = test.port
  let bandwidth = test.bandwidth 
  startingBandwidth = test.bandwidth
  let increment = test.increment
  let incrementDuration = test.incrementDuration
  let maxError = test.maxError
  
  let scheduler = test.scheduler
  let repeats = test.repeats
  let interval = test.interval
  let limit = test.limit 
  let directionality = test.directionality 
  
  disperfTests[remoteName] = {
    header:{
      date:null,
      time:null
    },
    settings: {
      ip:null,
      port:null,
      bandwidth:null,
      increment:null,
      incrementDuration:null,
      maxError:null,
      directionality: directionality,
      limit: limit,
      scheduler:null,
      repeats: repeats,
      interval: interval

    }
  }
  cancel = null
  

  // cancel any previous scheduler instance
  // clearInterval(schedule)
  // set interval length in milliseconds
  interval = interval * 60000
  // reset scheduler counter
  count = 0;
  // define iperf3 parameters
  let runTest;

  // for resetting the iperf3 parameters
  function setTestParams(bandwidth){
    if (directionality === 1){
      max.post('bi-directional testing enabled; using iperf3 -R flag')
      runTest = 'iperf3 -u -R -c ' + ip + ' -p ' + port + ' -b ' + bandwidth + 'M -f m -J -t ' + incrementDuration 
    } else{
      runTest = 'iperf3 -u -c ' + ip + ' -p ' + port + ' -b ' + bandwidth + 'M -f m -J -t ' + incrementDuration
    }
  }
  setTestParams(bandwidth);
  // setup disperf dictionary
  let setDisperf = async () => {
    max.post(bandwidth)
    disperfTests[remoteName].header['date'] = moment().format('YYYY/MM/D')
    disperfTests[remoteName].header['date'] = moment().format('hh:mm:ss a')
    disperfTests[remoteName].settings = {
      scheduler: scheduler,
      ip: ip,
      port: port,
      bandwidth: bandwidth + 'mbps',
      increment: increment + 'mbps',
      incrementDuration: incrementDuration + ' seconds',
      maxError: maxError + '%',
      directionality: directionality,
      limit: limit,
      scheduler: scheduler,
      repeats: repeats,
      interval: interval
    }
    await max.setDict('disperf', remoteName);
    await max.updateDict('disperf', remoteName + '.header.date', moment().format('YYYY/MM/D'))
    await max.updateDict('disperf', remoteName + '.header.time', moment().format('hh:mm:ss a'))
    await max.updateDict('disperf', remoteName + '.settings.scheduler', scheduler)
    await max.updateDict('disperf', remoteName + '.settings.ip', ip)
    await max.updateDict('disperf', remoteName + '.settings.port', port)
    await max.updateDict('disperf', remoteName + '.settings.bandwidth', bandwidth + 'mbps')
    await max.updateDict('disperf', remoteName + '.settings.increment', increment + 'mbps')
    await max.updateDict('disperf', remoteName + '.settings.incrementDuration', incrementDuration + ' seconds')
    await max.updateDict('disperf', remoteName + '.settings.maxError', maxError + '%')
    await max.outlet('disperf', 'updateDict')
  }
  setDisperf()
  
                //////////// SINGLE TEST (aka scheduler off) ///////////
  if (scheduler === 0){
    // only run disperf once
      function singleIncrementalTest(){
        if(cancel === 'stop'){
          return
        } else if (bandwidth >= limit) {
          max.post('test bandwidth reached network theoretical limit, ending test')
          max.outlet('disperf', 'updateDict')
          max.post(runTest)
          return;
        } else {

        
        exec(runTest, (stdout, stderr, err) =>{
          max.post(runTest)
          iperf3Result = JSON.parse(stderr)
          //max.post(iperf3Result)

          


          if (iperf3Result.error){
            // prevent intervals from calculating lost_percent value on first message
            max.outlet('disperfError', iperf3Result.error)
            max.outlet('stopDisperf')
          } else if(iperf3Result.end.sum.lost_percent < maxError){

            // replace keys: bps to mbps, bytes to megabytes
            iperf3Result.end.sum['mbps'] = iperf3Result.end.sum.bits_per_second / 1048576
            delete iperf3Result.end.sum.bits_per_second

            iperf3Result.end.sum['megabytes'] = bytesToX.toMegabytes(iperf3Result.end.sum.bytes, 3)
            delete iperf3Result.end.sum.bytes
            let updateDisperf = async () => { 
              max.post('437', bandwidth)
              disperfTests[remoteName]['@' + bandwidth + 'mbps'] = {
                date: moment().format('hh:mm:ss a'),
                time: moment().format('hh:mm:ss a'),
                result: iperf3Result.end.sum
              }
            
              // disperfTests[remoteName]['increment_' + count]['result.@' + bandwidth + 'mbps'] = iperf3Result.end.sum
              await max.updateDict('disperf', remoteName + '.date', moment().format('YYYY/MM/D'))
              await max.updateDict('disperf', remoteName + '.time', moment().format('hh:mm:ss a'))
              await max.updateDict('disperf', remoteName + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
              await max.outlet('disperf', 'updateDict')
              bandwidth = bandwidth + increment
              max.post('450', bandwidth)
              setTestParams(bandwidth)
              max.post('test bandwidth increased to ' + bandwidth)
              max.outlet('refreshDict')
              max.outlet('test bandwidth increased to ' + bandwidth)
              singleIncrementalTest()
            }
            updateDisperf()

            } else {
              let updateDisperf = async (bandwidth) => { 
                max.post('461', bandwidth)
                // replace keys: bps to mbps, bytes to megabytes
                iperf3Result.end.sum['mbps'] = iperf3Result.end.sum.bits_per_second / 1048576
                delete iperf3Result.end.sum.bits_per_second

                iperf3Result.end.sum['megabytes'] = bytesToX.toMegabytes(iperf3Result.end.sum.bytes, 3)
                delete iperf3Result.end.sum.bytes
                max.post('@' + bandwidth + 'mbps')
                disperfTests[remoteName]['@' + bandwidth + 'mbps'] = {
                  date: moment().format('hh:mm:ss a'),
                  time: moment().format('hh:mm:ss a'),
                  result: iperf3Result.end.sum
                }
                await max.updateDict('disperf', remoteName + '.date', moment().format('YYYY/MM/D'))
                await max.updateDict('disperf', remoteName + '.time', moment().format('hh:mm:ss a'))
                max.post('476', bandwidth)
                await max.updateDict('disperf', remoteName + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
                await max.outlet('disperf', 'updateDict')
              }
              updateDisperf(bandwidth)
                max.post('error percentage exceeded ' + maxError + '%, ending disperf. bandwidth capped out at ' + bandwidth)
                max.outlet('bandwidth capped out at ' + bandwidth)
                max.outlet('refreshDict')
                max.outlet('stopDisperf')
                // reset the tes   parameters
                bandwidth = startingBandwidth
                setTestParams(bandwidth)

                return;
            }
          
        })
      }
  }
  singleIncrementalTest()


                //////////// SCHEDULED TEST///////////

  } else if (scheduler === 1){
    incrementObj = {}
    // run the first test
    function scheduledFirstTest(){
      if(cancel === 'stop'){
        
        // reset the test parameters
        bandwidth = startingBandwidth
        setTestParams(bandwidth)
        return
      } else if (bandwidth >= limit) {
        max.post('test bandwidth reached network theoretical limit, ending test')
        max.outlet('disperf', 'updateDict')
        // reset the test parameters
        bandwidth = startingBandwidth
        setTestParams(bandwidth)
        return;
      } else{
        exec(runTest, (stdout, stderr, err) =>{
          iperf3Result = JSON.parse(stderr)
          max.post('lost%', iperf3Result.end.sum.lost_percent)
          if ('error' in iperf3Result){
            // prevent iperf3 intervals from calculating lost_percent value on first message
            max.outlet('disperfError', iperf3Result.error)
            max.outlet('stopDisperf')
            
          } else if(iperf3Result.end.sum.lost_percent < maxError){

            // replace keys: bps to mbps, bytes to megabytes
            iperf3Result.end.sum['mbps'] = iperf3Result.end.sum.bits_per_second / 1048576
            delete iperf3Result.end.sum.bits_per_second

            iperf3Result.end.sum['megabytes'] = bytesToX.toMegabytes(iperf3Result.end.sum.bytes, 3)
            delete iperf3Result.end.sum.bytes
            let updateDisperf = async () => { 
              await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.date', moment().format('YYYY/MM/D'))
              await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.time', moment().format('hh:mm:ss a'))
              await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
              await max.outlet('disperf', 'updateDict')
              bandwidth = bandwidth + increment
              setTestParams(bandwidth)
              max.post('test bandwidth increased to ' + bandwidth)
              max.outlet('refreshDict')
              max.outlet('test bandwidth increased to ' + bandwidth)
              scheduledFirstTest()
            }
            updateDisperf()

            } else {

              // replace keys: bps to mbps, bytes to megabytes
              iperf3Result.end.sum['mbps'] = iperf3Result.end.sum.bits_per_second / 1048576
              delete iperf3Result.end.sum.bits_per_second

              iperf3Result.end.sum['megabytes'] = bytesToX.toMegabytes(iperf3Result.end.sum.bytes, 3)
              delete iperf3Result.end.sum.bytes
              let updateDisperf = async () => { 
                // maybe we don't need to access the scheduled test results for jacktrip clients just yet. it gets comlicated. 
                // disperfTests[remoteName]['increment_' + count]['date'] = moment().format('YYYY/MM/D')
                // disperfTests[remoteName]['increment_' + count]['date'] = moment().format('hh:mm:ss a')
                // disperfTests[remoteName]['increment_' + count]['result.@' + bandwidth + 'mbps'] = iperf3Result.end.sum
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.date', moment().format('YYYY/MM/D'))
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.time', moment().format('hh:mm:ss a'))
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
                await max.outlet('disperf', 'updateDict')
              }
              updateDisperf()
              max.post('error percentage exceeded ' + maxError + '%, ending disperf. bandwidth capped out at ' + bandwidth)
              max.post('bandwidth capped out at ' + bandwidth)
              max.outlet('refreshDict')
              // reset the test parameters
              bandwidth = startingBandwidth
              setTestParams(bandwidth)

              return;
            }
          
          })
      }
    }
    scheduledFirstTest()
    
    // this runs after the first scheduled test: 
    let schedule = setInterval(function(){ 
      count++
      if (count > repeats){
        clearInterval(schedule)
      }
        else if (count <= repeats){
          if(cancel === 'stop'){
            // reset the test parameters
            bandwidth = startingBandwidth
            setTestParams(bandwidth)
            return
          } else if (bandwidth >= limit) {
            max.post('test bandwidth reached network theoretical limit, ending test')
            max.outlet('updateDisperfDict', 'bang')
            // reset the test parameters
            bandwidth = startingBandwidth
            setTestParams(bandwidth)
            return;
          } else{
          max.post('last bandwidth ' + bandwidth)
          bandwidth = startingBandwidth
          max.post('current bandwidth ' + bandwidth)
          // add the scheduler settings to the log
          let addDisperfInterval = async () => {
            await max.updateDict('disperf', remoteName + '.settings.scheduler', scheduler)
            await max.updateDict('disperf', remoteName + '.settings.repeats', repeats)
            await max.updateDict('disperf', remoteName + '.settings.interval', interval)
            await max.outlet('disperf', 'updateDict')
          }
        addDisperfInterval()



        function incrementalTest(){

          exec(runTest, (stdout, stderr, err) =>{

            iperf3Result = JSON.parse(stderr)
            max.post('lost_percent ' + iperf3Result.end.sum.lost_percent)
    
            if ('error' in iperf3Result){
              // prevent intervals from calculating lost_percent value on first message
              max.post('first message iperf3Error%', iperf3Result.error)
            } else if(iperf3Result.end.sum.lost_percent < maxError){
    
              let updateDisperf = async () => { 
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.date', moment().format('YYYY/MM/D'))
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.time', moment().format('hh:mm:ss a'))
                await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
                await max.outlet('disperf', 'updateDict')
                bandwidth = bandwidth + increment
                setTestParams(bandwidth)
                max.post('test bandwidth increased to ' + bandwidth)
                max.outlet('refreshDict')
                max.outlet('test bandwidth increased to ' + bandwidth)
                incrementalTest()
              }
              updateDisperf()

              } else {
                let updateDisperf = async () => { 
                  await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.date', moment().format('YYYY/MM/D'))
                  await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.time', moment().format('hh:mm:ss a'))
                  await max.updateDict('disperf', remoteName + '.individualTests.' + count + '.result.@' + bandwidth + 'mbps', iperf3Result.end.sum)
                  await max.outlet('disperf', 'updateDict')
                }
                updateDisperf()
                  max.post('error percentage exceeded ' + maxError + '%, ending disperf')
                  max.outlet('bandwidth capped out at ' + bandwidth)
                  max.outlet('refreshDict')
                  max.outlet('stopDisperf')
                  // reset the test parameters
                  bandwidth = startingBandwidth
                  setTestParams(bandwidth)
                  return;
              }
             
          })
        }
        incrementalTest()
      }
      bandwidth = startingBandwidth
      }
    }, interval);
  }

  
})

/*
const dictId = "disperf";

const setDisperf = async () => {
    await max.setDict(dictId, {
      remoteName: 
    });
    
    // my_dict =>
    // {
    //   "a": "first"
    // }
    
    // append to dict
    await max.updateDict(dictId, "b", "second");
    
    // my_dict =>
    // {
    //   "a": "first",
    //   "b": "second",
    // }
    
    // add nested path
    await max.updateDict(dictId, "c.deeply.nested.prop", "third");
    
    // my_dict =>
    // {
    //   "a": "first",
    //   "b": "second",
    //   "c": {
    //     "deeply": {
    //       "nested": {
    //         "prop": "third"
    //       }
    //     }
    //   }
    // }
    
    // this even works with arrays
    await max.updateDict(dictId, "d", []);
    await max.updateDict(dictId, "d[0]", "fourth");
    
}


*/

max.addHandler('audioMidiSetup', ()=>{
  let oascript = 'tell application "Audio MIDI Setup" to activate';
  applescript.execString(oascript, function(err, rtn) {
    if (err) {
      // Something went wrong!
    }
  });
})

max.addHandler('OSXSoundPreferences', ()=>{
  let oascript = 'tell application "System Preferences" to activate\ntell application "System Preferences"\n  reveal anchor "input" of pane id "com.apple.preference.sound"\nend tell';
 
  applescript.execString(oascript, function(err, rtn) {
    if (err) {
      max.post(err)
      // Something went wrong!
    }
  });
})

max.addHandler('getClipBoard', (service) =>{
  clipBoard = clipboardy.readSync();
  max.post(clipBoard)
})

//////////// PROCESS STATUSES /////////////////////

let pStats = {
  iperf2: {

  },
  iperf3: {

  },
  jack: {
    server: null,
    bufferSize: null,
    sampleRate: null,
    cmd: null

  },
  jacktrip:{
    active: null,
    info: null
  }
}

// check only at startup: 

exec('iperf -v', (stdout, stderr, err)=>{
  if(err){
    v = 'iperf2 ' + err.replace('version ', '').split(' ')[1]
    max.post('iperf2', v)
    pStats.iperf2['version'] = v,
    pStats.iperf2['server'] = null,
    pStats.iperf2['client'] = null

  } else {
    pStats.iperf2 = 'not installed'
  }
})
exec('iperf3 -v', (stdout, stderr, err)=>{
  if(stderr){
    pStats.iperf3['version'] = stderr.split('\n')[0],
    pStats.iperf3['server'] = null,
    pStats.iperf3['client'] = null

  } else {
    pStats.iperf2 = 'not installed'
  }
})

// check process statuses every 5 seconds:
max.addHandler('checkProcesses', () => {
//////////////////////// jack status //////////////////////////////////////////

  find('name', 'jackdmp', true).then(function (list) { 
    if (list.length === 0 || list === undefined){
      // if jackdmp is current running, set it to false
      pStats.jack.server = null
      pStats.jack.bufferSize = null
      pStats.jack.sampleRate = null
      pStats.jack.cmd = null

    } else {
      //max.post(list)
      // if jackdmp is current running, set to true
      pStats.jack.server = 1
      // TODO: use this to get other info about the running jack process
      pStats.jack.cmd = list[0].cmd
    // then get the buffer size and sample rate
      //if get the bufsize and samplerate
      let getBufSize = __dirname + '/jackClients/jack_bufsize'
      let getSampleRate = __dirname + '/jackClients/jack_samplerate'
      exec(getBufSize,(stdout,err,stderr) => {
        // max.post(err)
        pStats.jack.bufferSize = err
        
      }) 
      exec(getSampleRate,(err, stdout, stderr) => {
        pStats.jack.sampleRate = stdout
      }) 
    }
      /* could be useful if we want to check what the inputs and outputs are currently available
      exec('jack_lsp', {cwd:__dirname + '/jackClients'},(stdout,err,stderr) => {
        // max.post('stdout' + stdout, 'err', err, 'stderr',stderr)
        let jackServerStatus = err

        if(jackServerStatus.indexOf('JACK server not running') !== -1){
          max.post('caught what we are looking for')
        } else {
      */

      
    });

//////////////////////// jacktrip status(es) //////////////////////////////////////////
    let jtClients = []
    let jtServers = []
    find('name', 'jacktrip').then(function (list) {
      pStats.jacktrip.info = list
      pStats.jacktrip.active = list.length
      for (var i = 0; i < list.length; i++) {
        let thatIP = list[i].cmd.split(' ')[2]
        let thatPID = list[i].pid
        let jtArgs = list[i].cmd
        if (maxMadePIDs.includes(thatPID) === false){
          // todo: sort based on server sessions
          if (jtArgs.match(/-s/g)){
          // todo: sort based on client sessions
          } else if (jtArgs.match(/-c/g)){

          }
          // To do: monitor/output the jacktrip session data using this command:
          // dtruss -p <PID>
        } else {
          if (jtArgs.match(/-s/g)){
            // todo: sort based on client sessions
          } else if (jtArgs.match(/-c/g)){

          }
        }
      }
    }, function (err) {
    max.post(err.stack || err);
  })

//////////////////////// jack status //////////////////////////////////////////

find('name', 'jackdmp', true).then(function (list) { 
  if (list.length === 0 || list === undefined){
    // if jackdmp is current running, set it to false
    pStats.jack.server = null
    pStats.jack.bufferSize = null
    pStats.jack.sampleRate = null
    pStats.jack.cmd = null

  } else {
    //max.post(list)
    // if jackdmp is current running, set to true
    pStats.jack.server = 1
    // TODO: use this to get other info about the running jack process
    pStats.jack.cmd = list[0].cmd
  // then get the buffer size and sample rate
    //if get the bufsize and samplerate
    let getBufSize = __dirname + '/jackClients/jack_bufsize'
    let getSampleRate = __dirname + '/jackClients/jack_samplerate'
    exec(getBufSize,(stdout,err,stderr) => {
      // max.post(err)
      pStats.jack.bufferSize = err
      
    }) 
    exec(getSampleRate,(err, stdout, stderr) => {
      pStats.jack.sampleRate = stdout
    }) 
  }
    /* could be useful if we want to check what the inputs and outputs are currently available
    exec('jack_lsp', {cwd:__dirname + '/jackClients'},(stdout,err,stderr) => {
      // max.post('stdout' + stdout, 'err', err, 'stderr',stderr)
      let jackServerStatus = err

      if(jackServerStatus.indexOf('JACK server not running') !== -1){
        max.post('caught what we are looking for')
      } else {
    */

    
  });

///////////////////////////////////// end of function //////////////////////////    
    // at the very end, send out updated statuses:
    max.outlet('pStats', pStats)
})  

max.addHandler('getTest', (peer)=>{
  let testNode = disperfTests[peer]
  max.outlet('returnTestBandwidths', 'clear')
  Object.keys(testNode).forEach(function (key) {
    // console.log(item); // key
    // console.log(lunch[item]); // value
    max.post(key)
    
    if(key !== 'settings' && key !== 'header'){
      max.outlet('returnTestBandwidths', key)
      max.post(testNode[key])
    }  
  });

  max.outlet('returnTest', disperfTests[peer])


})