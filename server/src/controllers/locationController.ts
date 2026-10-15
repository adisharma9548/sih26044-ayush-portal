import { Request, Response } from 'express';
import { ALL_STATES_AND_UTS, getDistrictsForState, normalizeIndianLocation, isValidState } from '../config/indiaGeography';

export const getStates = async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: ALL_STATES_AND_UTS,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const state = req.query.state as string;
    if (!state) {
      return res.status(400).json({ error: { message: 'Query parameter "state" is required.' } });
    }

    if (!isValidState(state)) {
      return res.status(404).json({ error: { message: `State or UT "${state}" is not recognized in official Indian geography.` } });
    }

    const districts = getDistrictsForState(state);
    return res.json({
      success: true,
      state,
      data: districts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const normalizeLocation = async (req: Request, res: Response) => {
  try {
    const { rawLocation } = req.body;
    if (!rawLocation || typeof rawLocation !== 'string') {
      return res.status(400).json({ error: { message: 'rawLocation string is required in request body.' } });
    }

    const normalized = normalizeIndianLocation(rawLocation);
    return res.json({
      success: true,
      data: normalized,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};
