import { Zone } from "./index";

export type Artifact = {
  id: string;
  component: string;
  position: Zone;
  isSelected: boolean;
};
