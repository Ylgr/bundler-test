export const ERC20_PAYMASTER_ABI = [
    {
        type: "function",
        name: "getHash",
        inputs: [
            {
                name: "userOp",
                type: "tuple",
                internalType: "struct PackedUserOperation",
                components: [
                    {
                        name: "sender",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "nonce",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "initCode",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "callData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "accountGasLimits",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "preVerificationGas",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "gasFees",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "paymasterAndData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "signature",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
            {
                name: "validUntil",
                type: "uint48",
                internalType: "uint48",
            },
            {
                name: "validAfter",
                type: "uint48",
                internalType: "uint48",
            },
            {
                name: "tokenLimit",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        stateMutability: "view",
    },
];
