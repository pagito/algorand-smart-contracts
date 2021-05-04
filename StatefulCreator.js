const algosdk = require('algosdk');

// ## User declared algod connection parameters ## //
const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // <algod-token>
const algodServer = "http://localhost"; // <algod-address>
const algodPort = 4001; // <algod-port>


// Read args. Expecting mnemonic
var myArgs = process.argv.slice(2);
// Declare validArg var
var validArg = false;

// If Argument
if (myArgs.length) {
    switch (myArgs.length) {
        case 25:
            console.log(myArgs[0], 'correct account mnemonic length');
            validArg = true;
            break;
        default:
            console.log('Wrong account mnemonic length');
    }
} else {
    console.log('Please provide one Algorad account mnemonic. Example: node StatefulCreator.js <MNEMONIC>');
}

if (validArg) {
    // ## User declared account mnemonic ## //
    // Join Contract creator mnemonic words
    creatorMnemonic = myArgs.join(" ");

    // ## declare application state storage (immutable) ## //
    // the following four ints define the created application's storage
    localInts = 4; // number of ints in per-user local state
    localBytes = 3; // number of byte slices in per-user local state
    globalInts = 2; // number of ints in app's global state
    globalBytes = 1; // number of byte slices in app's global state


    // Helper function to compile program source
    async function compileProgram(client, program) {
        let programSource = '';
        // Import the filesystem module 
        var fs = require('fs'),
        path = require('path'),
        filePath = path.join(`${__dirname}/contracts`, program);
        programSource = fs.readFileSync(filePath);
        console.log("programSource: ", programSource)
        
        let encoder = new TextEncoder();
        let programBytes = encoder.encode(programSource);
        let compileResponse = await client.compile(programBytes).do();
        let compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, "base64"));
        return compiledBytes;
    }

    // Function used to wait for a tx confirmation
    const waitForConfirmation = async function (algodclient, txId) {
        let response = await algodclient.status().do();
        let lastround = response["last-round"];
        while (true) {
            const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
                break;
            }
            lastround++;
            await algodclient.statusAfterBlock(lastround).do();
        }
    };

    // create new application
    async function createApp(client, creatorAccount, approvalProgram, clearProgram, localInts, localBytes, globalInts, globalBytes) {
        // define sender as creator
        sender = creatorAccount.addr;

        // declare onComplete as NoOp
        onComplete = algosdk.OnApplicationComplete.NoOpOC;

        // get node suggested parameters
        let params = await client.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        params.fee = 1000;
        params.flatFee = true;
        console.log("Creator: ", sender)

        // create unsigned transaction
        let txn = algosdk.makeApplicationCreateTxn(sender, params, onComplete, 
                                                approvalProgram, clearProgram, 
                                                localInts, localBytes, globalInts, globalBytes,);
        let txId = txn.txID().toString();

        // Sign the transaction
        let signedTxn = txn.signTxn(creatorAccount.sk);
        console.log("Signed transaction with txID: %s", txId);
        console.log("signedTxn: ", signedTxn)

        // Submit the transaction
        await client.sendRawTransaction(signedTxn).do();

        console.log("Transaction sent")

        // Wait for confirmation
        await waitForConfirmation(client, txId);

        // display results
        let transactionResponse = await client.pendingTransactionInformation(txId).do();
        let appId = transactionResponse['application-index'];
        console.log("Created new app-id: ",appId);
        return appId;
    }

    async function main() {
        try {
            // initialize an algodClient
            let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

            // get accounts from mnemonic
            let creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
            console.log("Creator account: ", creatorAccount)

            // compile program
            let approvalProgram = await compileProgram(algodClient, 'creator.teal');
            let clearProgram = await compileProgram(algodClient, 'clear.teal');

            // create new application
            let appId = await createApp(algodClient, creatorAccount, approvalProgram, clearProgram, localInts, localBytes);
            console.log("Done")
        }
        catch (err){
            console.log("err", err);  
        }
    }

    main();
}