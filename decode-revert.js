import {decodeAbiParameters, decodeErrorResult, parseAbiParameters, sliceHex} from "viem";
import { EntryPointConfig } from "./utils.js";

const data = "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000184552433732313a20696e76616c696420746f6b656e2049440000000000000000";

const revertAbi = [{ type: 'string', name: 'Error' }];

const executionResultAbi = [
    { type: 'uint256', name: 'preOpGas' },
    { type: 'uint256', name: 'paid' },
    { type: 'uint48', name: 'validAfter' },
    { type: 'uint48', name: 'validUntil' },
    { type: 'bool', name: 'targetSuccess' },
    { type: 'bytes', name: 'targetResult' },
];

async function main() {
    // Decode the ExecutionResult event data
    const dataDecode = decodeErrorResult({
        abi: EntryPointConfig.abi,
        data: data,
    });

    // Log the result to check what was decoded
    console.log('Decoded Execution Result: ', dataDecode);

    // Extract the `targetSuccess` and `targetResult` from the decoded data
    const targetSuccess = dataDecode.args[4];
    const targetResult = dataDecode.args[5]; // This is the bytes `targetResult`
    // const targetSuccess = false;
    // const targetResult = "0x08C379A00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001D4D61726B6574706C6163653A20696E76616C69642061756374696F6E2E000000"
    console.log('targetSuccess: ', targetSuccess);
    console.log('targetResult (raw bytes): ', targetResult);

    // If the `targetSuccess` is false, try to decode the revert reason
    if (!targetSuccess) {
        const messageDecode = decodeAbiParameters(revertAbi, '0x' + targetResult.slice(10));
        console.log('Decoded Revert Reason: ', messageDecode);
    } else {
        console.log('No error, targetResult contains return data.');
    }
}

main().catch(console.error);
