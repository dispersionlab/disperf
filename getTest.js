// this is necessary for now... maybe eventually jut add it to the telematic script... 

inlets = 1

outlets = 2
function bang(){
var d = new Dict("disperf");
	
	// an optional 'true' arg to getnames() will get all dictionary names
	// rather than just explicitly named dictionaries
	//var names = d.getnames();
	
	//post("Names of existing dictionaries: " + names);
	//post();	

	// getkeys() will return an array of strings, each string being a key for our dict
	var keys = d.getkeys();
	outlet(0,keys)
	
	
	}