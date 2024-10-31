import {createBundlerClient, entryPoint06Address, toCoinbaseSmartAccount} from "viem/account-abstraction";
import {
    accountLocal,
    EntryPointConfig,
    pimlicoBundlerEndpoint,
    TokenPaymasterConfig
} from "../utils.js";
import {createPublicClient, encodeFunctionData, http, maxUint256, pad, parseAbi} from "viem";
import {sepolia} from "viem/chains";
import {createPimlicoClient} from "permissionless/clients/pimlico";

const usdcAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'

const client = createPublicClient({
    chain: sepolia,
    transport: http(),
});

async function main() {
    const account = await toCoinbaseSmartAccount({
        client,
        owners: [accountLocal],
    })



    const pimlicoClient = createPimlicoClient({
        chain: sepolia,
        transport: http(pimlicoBundlerEndpoint),
        entryPoint: {
            address: entryPoint06Address,
            version: "0.6",
        },
    })

    const bundlerClient = createBundlerClient({
        client,
        transport:  http(pimlicoBundlerEndpoint),
        account,
        paymaster: pimlicoClient,
    })

    const nonce = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getNonce',
        args: [account.address, 0n],
    })

    const hash = await bundlerClient.sendUserOperation({
        calls: [
            {
                to: usdcAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: TokenPaymasterConfig.abi,
                    functionName: 'approve',
                    args: ['0x00000000000000fb866daaa79352cc568a005d96', maxUint256],
                })
            },
            {
                to: usdcAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: TokenPaymasterConfig.abi,
                    functionName: 'approve',
                    args: ['0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', maxUint256],
                })
            },
            {
                to: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                value: 0n,
                data: encodeFunctionData({
                    abi: [{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint32","name":"destinationDomain","type":"uint32"},{"internalType":"bytes32","name":"mintRecipient","type":"bytes32"},{"internalType":"address","name":"burnToken","type":"address"}],"name":"depositForBurn","outputs":[{"internalType":"uint64","name":"_nonce","type":"uint64"}],"stateMutability":"nonpayable","type":"function"}],
                    functionName: 'depositForBurn',
                    args: [1000000, 3, pad(account.address), usdcAddress],
                })
            }
        ],
        nonce: nonce,
        paymasterContext: {
            token: usdcAddress,
        },
    });
    console.log('hash: ', hash)
    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash
    })

    console.log('receipt: ', receipt)
}

main().catch(console.error);
