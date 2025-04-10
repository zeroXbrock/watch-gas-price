const { ethers } = require("ethers");
const fs = require("fs");

// Get the RPC endpoint from command-line arguments
const rpcEndpoint = process.argv[2];
if (!rpcEndpoint) {
    console.error(`usage: node index.js <rpc-endpoint>`);
    process.exit(1);
}

// Create a provider
const provider = new ethers.JsonRpcProvider(rpcEndpoint);

const col1Width = 22;
const col2Width = 42;

// print a row in the table format
const printRow = (label, value) => {
    console.log(`| ${label.padEnd(col1Width)} | ${value.padEnd(col2Width)} |`);
};

const printDash = () => {
    console.log(`|${"-".repeat(col1Width + col2Width + 5)}|`);
}

const printSpecialMessage = (message) => {
    printDash();
    console.log(`| ${message.padEnd(col1Width + col2Width + 3)} |`);
    printDash();
}

const printHeader = (data) => {
    console.log();
    printSpecialMessage(data);
}

function saveMissedBlock (data) {
    const logMessage = `[${Date.now().toLocaleString()}] { blockNumber: ${data.blockNumber}, gasUsed: "${data.gasUsedPercentageFormatted}%", numTxs: ${data.numTxs} }\n`;
    fs.appendFile("failure.logs", logMessage, (err) => {
        if (err) {
            console.error("Error writing to file:", err);
        } else {
            console.log("* Log message appended to failure.logs");
        }
    });
}

async function watchGasParameters() {
    console.log("Watching gas parameters...");
    provider.on("block", async (blockNumber) => {
        try {
            let block = await provider.getBlock(blockNumber);
            while (!block) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                block = await provider.getBlock(blockNumber);
            }
            let lastTx = null;
            if ("transactions" in block && block.transactions.length > 0) {
                const lastTxHash = block.transactions[block.transactions.length - 1];
                lastTx = await provider.getTransaction(lastTxHash);
            }
            const gasPrice = await provider.getFeeData();
            const maxFeePerGas = gasPrice.maxFeePerGas;
            const maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
            const gasLimit = block.gasLimit;
            const gasUsed = block.gasUsed;
            const baseFeePerGas = block.baseFeePerGas;
            const baseFeePerGasFormatted = ethers.formatUnits(baseFeePerGas, "gwei");
            const gasUsedPercentage = (Number(gasUsed) / Number(gasLimit)) * 100;
            const gasUsedPercentageFormatted = parseFloat(String(gasUsedPercentage)).toFixed(2);
            const gasPriceFormatted = ethers.formatUnits(gasPrice.gasPrice, "gwei");
            const maxFeePerGasFormatted = ethers.formatUnits(maxFeePerGas, "gwei");
            const maxPriorityFeePerGasFormatted = ethers.formatUnits(maxPriorityFeePerGas, "gwei");
            const numTxs = block.transactions ? block.transactions.length : 0;
            
            printHeader(`Block ${blockNumber}`);
            printRow("Block Number", blockNumber.toString());
            printRow("Gas Used", `${gasUsed} / ${gasLimit} (${gasUsedPercentageFormatted}%)`);
            printRow("Max Fee Per Gas", `${maxFeePerGasFormatted} gwei`);
            printRow("Max Priority Fee", `${maxPriorityFeePerGasFormatted} gwei`);
            printRow("Gas Price", `${gasPriceFormatted} gwei`);
            printRow("Base Fee Per Gas", `${baseFeePerGasFormatted} gwei`);
            printRow("Transactions in Block", numTxs.toString());
            if (lastTx) {
                let data = lastTx.data;
                const builtByFlashbots = (() => {
                    try {
                        const decodedData = ethers.toUtf8String(data);
                        return decodedData == `Block Number: ${blockNumber}`
                    } catch (err) {
                        return false;
                    }})();
                printRow("Built by Flashbots", builtByFlashbots ? "YES" : "NO");
                if (!builtByFlashbots) {
                    const data = {
                        gasPrice,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        gasLimit,
                        gasUsed,
                        gasUsedPercentage,
                        gasUsedPercentageFormatted,
                        baseFeePerGas,
                        numTxs,
                        blockNumber,
                    }
                    // append this result to a file "failure.logs"
                    saveMissedBlock(data);
                }
            }
            printDash();
        } catch (error) {
            console.error("Error fetching gas parameters:", error);
        }
    });
}

watchGasParameters();