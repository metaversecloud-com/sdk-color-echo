export const fireToast = jest.fn().mockResolvedValue({ success: true });
export const fetchDataObject = jest.fn().mockResolvedValue({});
export const updateDataObject = jest.fn().mockResolvedValue({});
export const setDataObject = jest.fn().mockResolvedValue({});
export const fetchInventoryItems = jest.fn().mockResolvedValue([]);
export const grantInventoryItem = jest.fn().mockResolvedValue({});
export const triggerParticle = jest.fn().mockResolvedValue({});

export class Topia {
  constructor(_opts: any) {}
}

export class AssetFactory {
  constructor(_topia: any) {}
}

export class DroppedAssetFactory {
  constructor(_topia: any) {}
  get(_id: string, _slug: string, _opts: any) {
    return {
      id: "dropped-asset-123",
      position: { x: 100, y: 200 },
      dataObject: {
        maxColors: 6,
        lives: 3,
        speed: "progressive",
        particlesEnabled: true,
        leaderboard: {},
      },
      fetchDataObject,
      updateDataObject,
      setDataObject,
    };
  }
}

export class EcosystemFactory {
  constructor(_topia: any) {}
  create(_opts: any) {
    return {
      inventoryItems: [],
      fetchInventoryItems,
    };
  }
}

export class UserFactory {
  constructor(_topia: any) {}
}

export class VisitorFactory {
  constructor(_topia: any) {}
  get(_id: number, _slug: string, _opts: any) {
    return {
      isAdmin: true,
      id: 1,
      inventoryItems: [],
      fetchInventoryItems,
      grantInventoryItem,
      fireToast,
      updateDataObject,
    };
  }
  create(_id: number, _slug: string, _opts: any) {
    return {
      isAdmin: false,
      id: 1,
      inventoryItems: [],
      fetchInventoryItems,
      grantInventoryItem,
      fireToast,
      updateDataObject,
    };
  }
}

export class WorldFactory {
  constructor(_topia: any) {}
  create(slug: string, opts: any) {
    (__mock as any).lastWorldCreateArgs = { slug, opts };
    return { fireToast, triggerParticle };
  }
}

export class WorldActivityFactory {
  constructor(_topia: any) {}
}

export const __mock = {
  fireToast,
  fetchDataObject,
  updateDataObject,
  setDataObject,
  fetchInventoryItems,
  grantInventoryItem,
  triggerParticle,
  lastWorldCreateArgs: null as any,
  reset() {
    fireToast.mockClear();
    fetchDataObject.mockClear();
    updateDataObject.mockClear();
    setDataObject.mockClear();
    fetchInventoryItems.mockClear();
    grantInventoryItem.mockClear();
    triggerParticle.mockClear();
    this.lastWorldCreateArgs = null;
  },
};
