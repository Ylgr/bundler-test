import {createBundlerClient, toCoinbaseSmartAccount} from "viem/account-abstraction";
import {
    AccountConfig,
    accountLocal,
    EntryPointConfig,
    pimlicoBundlerEndpoint,
    TokenPaymasterConfig
} from "../utils.js";
import {createPublicClient, encodeFunctionData, http, maxUint256, parseEther} from "viem";
import {sepolia} from "viem/chains";

const usdcAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'
const inboxAddress = '0xaAe29B0366299461418F5324a79Afc425BE5ae21'

const client = createPublicClient({
    chain: sepolia,
    transport: http(),
});

async function main() {
    const account = await toCoinbaseSmartAccount({
        client,
        owners: [accountLocal],
    })

    const bundlerClient = createBundlerClient({
        client,
        transport:  http(pimlicoBundlerEndpoint),
        account,
    })

    const nonce = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getNonce',
        args: [account.address, 0n],
    })

    console.log('account.address: ', account.address)

    const callData = encodeFunctionData({
        abi: [
            {
                "inputs": [],
                "name": "depositEth",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ],
        functionName: 'depositEth',
        args: [],
    })

    console.log('callData: ', callData)



    // const hash = await bundlerClient.sendUserOperation({
    //     calls: [
    //         {
    //             to: inboxAddress,
    //             value: parseEther('0.01'),
    //             data: encodeFunctionData({
    //                 abi: [
    //                     {
    //                         "inputs": [],
    //                         "name": "depositEth",
    //                         "outputs": [
    //                             {
    //                                 "internalType": "uint256",
    //                                 "name": "",
    //                                 "type": "uint256"
    //                             }
    //                         ],
    //                         "stateMutability": "payable",
    //                         "type": "function"
    //                     }
    //                 ],
    //                 functionName: 'depositEth',
    //                 args: [],
    //             })
    //         }
    //     ],
    //     nonce: nonce,
    // });
    // console.log('hash: ', hash)
    // const receipt = await bundlerClient.waitForUserOperationReceipt({
    //     hash
    // })
    //
    // console.log('receipt: ', receipt)
}

main().catch(console.error);
