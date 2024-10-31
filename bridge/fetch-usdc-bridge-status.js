import {sepolia} from "viem/chains";
import {createPublicClient, decodeEventLog, http, keccak256} from "viem";

const client = createPublicClient({
    chain: sepolia,
    transport: http(),
});

async function fetchMessageHash(transactionHash) {
    // Fetch transaction receipt
    const transactionReceipt = await client.getTransactionReceipt({ hash: transactionHash });
    console.log('transactionReceipt: ', transactionReceipt)
    // Get event topic hash
    const eventTopic = keccak256('MessageSent(bytes)');
    console.log('eventTopic: ', eventTopic)
    // Find the log matching the event topic
    const log = transactionReceipt.logs.find((l) => l.topics[0] === eventTopic);
    console.log('log: ', log)
    // Decode the message bytes from the log data
    const messageBytes = decodeEventLog({
        abi: [{ type: 'event', name: 'MessageSent', inputs: [{ type: 'bytes', name: 'message' }] }],
        data: log.data,
        topics: log.topics,
    }).args.message;

    // Compute the message hash
    const messageHash = keccak256(messageBytes);

    console.log('messageHash: ', messageHash);

    let attestationResponse = {status: 'pending'};
    while(attestationResponse.status !== 'complete') {
        const response = await fetch(`https://iris-api-sandbox.circle.com/attestations/${messageHash}`);
        attestationResponse = await response.json()
        console.log('attestationResponse.status: ', attestationResponse.status)
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log('messageBytes: ', messageBytes)
    console.log('attestation: ', attestationResponse.attestation)
}

// Usage: Replace with your actual transaction hash
const burnTxHash = '0xe1bb0a48aa7aa6b3f5c121947186e5ce4c92414513091c55ea03d7b65911d055';
fetchMessageHash(burnTxHash).catch(console.error);
