import type { umbraStatusEnum } from "@/db/schema";

export type UmbraStatus = (typeof umbraStatusEnum.enumValues)[number];

export type ProfileIdentity = {
  handle: string;
  displayName: string | null;
  vaultPubkey: string;
  umbraStatus: UmbraStatus;
  receiptEncryptionPublicKey: string;
  subPath?: string;
};

export type ProfileDetails = ProfileIdentity & {
  bio: string | null;
};
