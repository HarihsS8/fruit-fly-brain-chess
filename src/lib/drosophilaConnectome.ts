import { ConnectomeNeuronNode, NeuropilRegion, Neurotransmitter, SynapseLink } from "../types";

export class DrosophilaConnectomeModel {
  public neurons: ConnectomeNeuronNode[] = [];
  public synapses: SynapseLink[] = [];
  public adjacencyMatrix: Float32Array; // Flattened N x N
  public plasticMask: Uint8Array;      // Flattened N x N boolean
  public sensoryIds: number[] = [];
  public motorIds: number[] = [];
  public kcIds: number[] = [];
  public mbonIds: number[] = [];
  public cxIds: number[] = [];

  constructor(seed: number = 42) {
    this._buildNeurons();
    const n = this.neurons.length;
    this.adjacencyMatrix = new Float32Array(n * n);
    this.plasticMask = new Uint8Array(n * n);
    this._buildSynapses(seed);
  }

  private _buildNeurons() {
    let curId = 0;

    // 1. Optic Lobe Columns (Medulla 64 squares for 8x8 chessboard)
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const sqName = `${String.fromCharCode(97 + file)}${rank + 1}`;
        const hemisphere = file < 4 ? -1 : 1;
        const x = hemisphere * (200 + file * 16);
        const y = -80 + rank * 24;
        const z = 40 + (rank % 2) * 10;
        
        // Project to 2D canvas coordinates (centered at 300, 200)
        const px = hemisphere < 0 ? 50 + file * 20 : 430 + (file - 4) * 20;
        const py = 60 + rank * 24;

        this.neurons.push({
          id: curId,
          name: `OL_Mi1_${sqName}`,
          region: NeuropilRegion.OPTIC_LOBE_MEDULLA,
          neurotransmitter: Neurotransmitter.ACETYLCHOLINE,
          isSensory: true,
          x, y, z, px, py,
        });
        this.sensoryIds.push(curId);
        curId++;
      }
    }

    // 2. Tactical & Glomerular Evaluative Units (16 units)
    for (let i = 0; i < 16; i++) {
      const px = 200 + (i % 8) * 16;
      const py = 320 + Math.floor(i / 8) * 20;
      this.neurons.push({
        id: curId,
        name: `AL_Glom_${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.ANTENNAL_LOBE,
        neurotransmitter: Neurotransmitter.ACETYLCHOLINE,
        isSensory: true,
        x: -60 + (i % 8) * 15,
        y: -120,
        z: 10 + Math.floor(i / 8) * 20,
        px, py,
      });
      this.sensoryIds.push(curId);
      curId++;
    }

    // 3. Mushroom Body: 120 Kenyon Cells (KCs)
    for (let i = 0; i < 120; i++) {
      const sub = i < 60 ? "α/β" : "γ";
      const row = Math.floor(i / 20);
      const col = i % 20;
      const px = 150 + col * 12;
      const py = 90 + row * 16;
      this.neurons.push({
        id: curId,
        name: `KC_${sub}_${i.toString().padStart(3, "0")}`,
        region: NeuropilRegion.MUSHROOM_BODY_KC,
        neurotransmitter: Neurotransmitter.ACETYLCHOLINE,
        x: -120 + (i % 20) * 12,
        y: 80 + (i % 5) * 8,
        z: 90 + Math.floor(i / 20) * 15,
        px, py,
      });
      this.kcIds.push(curId);
      curId++;
    }

    // 4. MB Output Neurons (16 MBONs)
    for (let i = 0; i < 16; i++) {
      const nt = i < 8 ? Neurotransmitter.ACETYLCHOLINE : Neurotransmitter.GABA;
      const px = 180 + (i % 8) * 18;
      const py = 200 + Math.floor(i / 8) * 18;
      this.neurons.push({
        id: curId,
        name: `MBON_${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.MUSHROOM_BODY_MBON,
        neurotransmitter: nt,
        x: -40 + (i % 8) * 10,
        y: 50,
        z: 60 + Math.floor(i / 8) * 20,
        px, py,
      });
      this.mbonIds.push(curId);
      curId++;
    }

    // 5. Dopaminergic Neurons (8 DANs)
    for (let i = 0; i < 8; i++) {
      const px = 200 + i * 16;
      const py = 175;
      this.neurons.push({
        id: curId,
        name: `DAN_PAM_${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.MUSHROOM_BODY_DAN,
        neurotransmitter: Neurotransmitter.DOPAMINE,
        x: -30 + i * 8,
        y: 30,
        z: 50,
        px, py,
      });
      curId++;
    }

    // 6. Central Complex (32 units: 16 EB Ring, 16 PB columns)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const px = 270 + Math.cos(angle) * 32;
      const py = 140 + Math.sin(angle) * 32;
      this.neurons.push({
        id: curId,
        name: `CX_EB_Ring_${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.CENTRAL_COMPLEX_EB,
        neurotransmitter: Neurotransmitter.GABA,
        x: -20 + (i % 4) * 12,
        y: -10,
        z: 80 + Math.floor(i / 4) * 8,
        px, py,
      });
      this.cxIds.push(curId);
      curId++;
    }
    for (let i = 0; i < 16; i++) {
      const px = 200 + i * 9;
      const py = 85;
      this.neurons.push({
        id: curId,
        name: `CX_PB_Col_${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.CENTRAL_COMPLEX_PB,
        neurotransmitter: Neurotransmitter.ACETYLCHOLINE,
        x: -50 + i * 6.5,
        y: 10,
        z: 110,
        px, py,
      });
      this.cxIds.push(curId);
      curId++;
    }

    // 7. Descending Motor Neurons (64 DNs)
    for (let i = 0; i < 64; i++) {
      const rank = Math.floor(i / 8);
      const file = i % 8;
      const px = 190 + file * 16;
      const py = 250 + rank * 12;
      this.neurons.push({
        id: curId,
        name: `DN_p${i.toString().padStart(2, "0")}`,
        region: NeuropilRegion.DESCENDING_NEURONS,
        neurotransmitter: Neurotransmitter.ACETYLCHOLINE,
        isMotor: true,
        x: -80 + (i % 8) * 22,
        y: -80,
        z: -20 - Math.floor(i / 8) * 10,
        px, py,
      });
      this.motorIds.push(curId);
      curId++;
    }
  }

  private _buildSynapses(seed: number) {
    let pseudoRand = seed;
    const rand = () => {
      pseudoRand = (pseudoRand * 9301 + 49297) % 233280;
      return pseudoRand / 233280;
    };

    const N = this.neurons.length;

    // A. Sensory -> Kenyon Cells (Sparse claws)
    for (const kcId of this.kcIds) {
      const claws = 5 + Math.floor(rand() * 3);
      for (let c = 0; c < claws; c++) {
        const sIdx = Math.floor(rand() * this.sensoryIds.length);
        const sId = this.sensoryIds[sIdx];
        const w = 0.6 + rand() * 0.6;
        this.synapses.push({ preId: sId, postId: kcId, weight: w });
        this.adjacencyMatrix[sId * N + kcId] = w;
      }
    }

    // B. Sensory -> Central Complex (Heading integration)
    for (let i = 0; i < 64; i++) {
      const sId = this.sensoryIds[i];
      const ebTarget = this.cxIds[i % 16];
      const w = 0.3 + rand() * 0.4;
      this.synapses.push({ preId: sId, postId: ebTarget, weight: w });
      this.adjacencyMatrix[sId * N + ebTarget] += w;
    }

    // C. Kenyon Cells -> MBONs (Plastic Associative weights)
    for (const kcId of this.kcIds) {
      for (let t = 0; t < 4; t++) {
        const mbonIdx = Math.floor(rand() * this.mbonIds.length);
        const mbonId = this.mbonIds[mbonIdx];
        const w = 0.15 + rand() * 0.35;
        this.synapses.push({ preId: kcId, postId: mbonId, weight: w, isPlastic: true });
        this.adjacencyMatrix[kcId * N + mbonId] = w;
        this.plasticMask[kcId * N + mbonId] = 1;
      }
    }

    // D. Central Complex & MBONs -> Descending Neurons (Motor drives)
    for (const cxId of this.cxIds) {
      for (let d = 0; d < 4; d++) {
        const dnIdx = Math.floor(rand() * this.motorIds.length);
        const dnId = this.motorIds[dnIdx];
        const w = 0.25 + rand() * 0.4;
        this.synapses.push({ preId: cxId, postId: dnId, weight: w });
        this.adjacencyMatrix[cxId * N + dnId] += w;
      }
    }

    for (const mbonId of this.mbonIds) {
      const isGABA = this.neurons[mbonId].neurotransmitter === Neurotransmitter.GABA;
      const sign = isGABA ? -1 : 1;
      for (const dnId of this.motorIds) {
        if (rand() < 0.3) {
          const w = sign * (0.2 + rand() * 0.4);
          this.synapses.push({ preId: mbonId, postId: dnId, weight: w });
          this.adjacencyMatrix[mbonId * N + dnId] += w;
        }
      }
    }
  }
}
