const { ethers } = require("ethers");

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

async function watchGasParameters() {
    console.log("Watching gas parameters...");


    provider.on("block", async (blockNumber) => {
        try {
            const block = await provider.getBlock(blockNumber);
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
            const numTxs = block.transactions.length;
            
            printHeader(`Block ${blockNumber}`);
            printRow("Block Number", blockNumber.toString());
            printRow("Gas Used", `${gasUsed} / ${gasLimit} (${gasUsedPercentageFormatted}%)`);
            printRow("Max Fee Per Gas", `${maxFeePerGasFormatted} gwei`);
            printRow("Max Priority Fee", `${maxPriorityFeePerGasFormatted} gwei`);
            printRow("Gas Price", `${gasPriceFormatted} gwei`);
            printRow("Base Fee Per Gas", `${baseFeePerGasFormatted} gwei`);
            printRow("Transactions in Block", numTxs.toString());
            printDash();
        } catch (error) {
            console.error("Error fetching gas parameters:", error);
        }
    });
}

watchGasParameters();