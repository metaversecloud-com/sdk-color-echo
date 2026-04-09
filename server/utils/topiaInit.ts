import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { Topia, DroppedAssetFactory, EcosystemFactory, VisitorFactory } from "@rtsdk/topia";

const config = {
  apiDomain: process.env.INSTANCE_DOMAIN || "api.topia.io",
  apiProtocol: process.env.INSTANCE_PROTOCOL || "https",
  interactiveKey: process.env.INTERACTIVE_KEY,
  interactiveSecret: process.env.INTERACTIVE_SECRET,
};

const myTopiaInstance = new Topia(config);

const DroppedAsset = new DroppedAssetFactory(myTopiaInstance);
const Ecosystem = new EcosystemFactory(myTopiaInstance);
const Visitor = new VisitorFactory(myTopiaInstance);

export { DroppedAsset, Ecosystem, Visitor };
