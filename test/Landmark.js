// Load the helper functions
var fs = require('fs');
const helper = require('./helper_funcs.js');
for (var key in helper) global[key] = helper[key];

const default_limitLength = 496;
const versionNumber = 1;

contract('Landmark', function(accounts) {
    
    var msg0 = "hello world!";
    var msg1 = "LOL! 💩 Emoji in Landmark 😀😀😀";
    var msg2 = "is there a point?";
    var msg3 = "this is the end.";
    var profileMsg0 = "This is the place.";
    

    var User = accounts[2];
    var fwdAddress = accounts[9];

    // *********************************************************************
    // Setters
    // *********************************************************************
    
    it("Simple, single post", async function() {
	const x = await promise_execute("postMessage", msg0);
	logGas(this.test.title, x);
	console.log("Contract address", await getContractAddress());
    });

    it("Post curator message", async function() {
	const x = await promise_execute("postCuratorMessage", profileMsg0);
	logGas(this.test.title, x);
    });

    it("Unicode characters in post", async function() {
	await sleep(100);  // delay in posting to find timing differences
	await promise_execute("postMessage", msg1);
	const idx  = (await promise_call("getMessageCount")) - 1;
	const msgX = (await promise_call("getMessageContents",idx));
	console.log("Emoji test:", msgX);
    });

    // *********************************************************************
    // Getters
    // *********************************************************************

    it("Check post count", async function() {
	// Post a few extra messages
	promise_execute("postMessage", msg2);
	promise_execute("postMessage", msg3);
	const result = await promise_call("getMessageCount");
	assert.equal(result.toNumber(), 4);
    });

    it("Get version number", async function() {
	assert.equal(await promise_call("getVersionNumber"), versionNumber);
    });

    it("Get max post length", async function() {
	const maxlength = (await promise_call("getLimitPostLength"));
	assert.equal(maxlength.toNumber(), default_limitLength);
    });
    
    it("Get post length", async function() {
	const length_eth = (await promise_call("getPostLength",  msg3));
	const length_js  = fancyCount(msg3);
	assert.equal(length_eth, length_js);
    });

    it("Get message contents", async function() {
	const result = (await promise_call("getMessageContents", 1));
	assert.equal(result, msg1);
    });

    it("Get curator message contents", async function() {
	const result = (await promise_call("getCuratorMessage"));
	assert.equal(result, profileMsg0);
    });

    it("Get message sender address", async function() {
	const result = (await promise_call("getMessageAddress", 1));
	assert.equal(result, accounts[0]);
	console.log("Message sender address", result);
    });

    it("Get message timestamp", async function() {
	const t0 = (await promise_call("getMessageTimestamp", 0));
	const t2 = (await promise_call("getMessageTimestamp", 3));
	assert(t0.toNumber() <= t2.toNumber(), "timestamps out of order");
    });

    // *********************************************************************
    // Bounds checking
    // *********************************************************************

    it("Ask for a message that doesn't exist (larger than idx)",
       async function() {
	const k = (await promise_call("getMessageCount")).toNumber();
	failCall("getMessageContents", k+1);
    });

    it("Ask for a message that doesn't exist (negative)", function() {
	failCall("getMessageContents", -1);
    });

    it("Post a message too long", async function() {
	const k = (await promise_call("getLimitPostLength")).toNumber();
	const msg = 'x'.repeat(k+1)
	failExecute("postMessage", msg);
    });

    it("Try post curator message as non curator", async function() {
	failExecute("postCuratorMessage", profileMsg0, {from:User});
    });



    // *********************************************************************
    // Stress tests
    // *********************************************************************
    
    it("Stress test (longest post)", async function() {
	const k = (await promise_call("getLimitPostLength")).toNumber();
	var msg='x'

	var single = await promise_execute("postMessage", msg.repeat(1));
	var multi = await promise_execute("postMessage", msg.repeat(k));

	var cost_single = single.receipt.gasUsed;
	var cost_multi = multi.receipt.gasUsed;
	
	console.log("Single post gasUsed per char", cost_single);
	console.log("Multi  post gasUsed per char", cost_multi/k);

	logGas(this.test.title, multi);	
    });
    
    
    it("Stress test (N posts)", function() {
	var N=50;
	var promiseList = [];
	for (i = 0; i<N; i++) {
	    promise_execute("postMessage", msg0).then(function(result) {
		//console.log("posted", result.tx, "to", result.receipt.blockNumber);
	    });
	}
    });
        
   
    // *********************************************************************
    // Shutdown 
    // *********************************************************************

    it("Set forwarding address early before closed", async function() {
	failExecute("setForwardingAddress", fwdAddress);
    });
    
    it("Non-curator shutdown or forwarding", function() {
	failExecute("closeLandmarkSite", {from:accounts[1]});
	failExecute("setForwardingAddress", fwdAddress, {from:accounts[1]});
    });
    
    it("Shutdown and verify closed", async function() {
	const curator = await promise_call("getCuratorAddress");
	assert.equal(await promise_call("getIsSiteOpen"), true);
	var x = await promise_execute("closeLandmarkSite", {from:curator});
	assert.equal(await promise_call("getIsSiteOpen"), false);
	logGas(this.test.title, x);
    });

    it("Post message on shutdown site", async function() {
	failExecute("postMessage", msg0);
    });

    it("Set forwarding address", async function() {
	const curator = await promise_call("getCuratorAddress");
	var x = await promise_execute("setForwardingAddress",
				      fwdAddress, {from:curator});
	logGas(this.test.title, x);
    });

    it("Get forwarding address", async function() {
	const loc1 = await promise_call("getForwardingAddress",
					{from:accounts[1]});
	assert.equal(fwdAddress, loc1);
    });
    
   
    it("Save the gas costs to file (not a test)", function() {
	var f_json = './test/gasCosts.json';
	fs.writeFileSync(f_json, JSON.stringify(transactionLog,null,2));
    });

    
});
