import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CustomSwapModule = buildModule("CustomSwapModule", (m) => {
  // Deploy the CustomSwap contract
  const customSwap = m.contract("CustomSwap");

  // You can add more configuration or additional steps here if needed

  return { customSwap };
});

export default CustomSwapModule;
