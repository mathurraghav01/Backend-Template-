// routes/strategies.ts
import { Router, Request, Response } from "express";
import mongoose, { Schema, Document } from "mongoose";

const router = Router();


interface ITrade extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: string;
  tradeDate: Date;
  riskLevel: "low" | "medium" | "high";
  outcome: number;
  win: boolean;
  performanceNotes?: string;
}

const tradeSchema = new Schema<ITrade>({
  userId: { type: Schema.Types.ObjectId, required: true },
  strategyId: { type: String, required: true },
  tradeDate: { type: Date, required: true },
  riskLevel: { type: String, enum: ["low", "medium", "high"], required: true },
  outcome: { type: Number, required: true },
  win: { type: Boolean, required: true },
  performanceNotes: { type: String }
});

const Trade = mongoose.model<ITrade>("Trade", tradeSchema);

// 2. Helper: correlation calculation
function correlation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
  const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));

  return denominatorX && denominatorY ? numerator / (denominatorX * denominatorY) : 0;
}

// 3. Route Handler
router.get("/optimize/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // --- Strategy stats for last 30 days ---
    const strategyStats = await Trade.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          tradeDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$strategyId",
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: ["$win", 1, 0] } }
        }
      },
      {
        $project: {
          strategyId: "$_id",
          winRate: { $multiply: [{ $divide: ["$wins", "$totalTrades"] }, 100] }
        }
      }
    ]);

    const underperforming = strategyStats.filter((s) => s.winRate < 50);

    // --- Risk level analysis ---
    const riskStats = await Trade.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$riskLevel",
          avgOutcome: { $avg: "$outcome" },
          count: { $sum: 1 }
        }
      }
    ]);

    const riskMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const risks = riskStats.map((r) => riskMap[r._id as string]);
    const outcomes = riskStats.map((r) => r.avgOutcome);

    const riskCorrelation = correlation(risks, outcomes);

    // --- Suggestions ---
    const suggestions: string[] = [];

    underperforming.forEach((s) => {
      suggestions.push(`Refine entry criteria for strategy ${s.strategyId}`);
    });

    const lowRisk = riskStats.find((r) => r._id === "low");
    if (lowRisk && lowRisk.avgOutcome > 0) {
      suggestions.push("Increase position size for low-risk trades");
    }

    if (riskCorrelation < -0.3) {
      suggestions.push("Reduce exposure to high-risk trades");
    }

    res.json({
      underperformingStrategies: underperforming.map((s) => s.strategyId),
      riskAnalysis: riskStats,
      riskCorrelation,
      suggestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
