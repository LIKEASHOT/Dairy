import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { AppConfig, DayData, Tag } from '../../src/types';
import { buildDeepSeekPrompt, requestDeepSeek } from '../../src/services/deepseek';

export function loadEnvConfig(): AppConfig {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Auto-create .env from .env.example if missing
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
    } catch (e) {
      console.warn('Failed to auto-create .env file:', e);
    }
  }

  const envConfig = dotenv.config({ path: envPath }).parsed || {};

  return {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || envConfig.DEEPSEEK_API_KEY || '',
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || envConfig.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    deepseekModel: process.env.DEEPSEEK_MODEL || envConfig.DEEPSEEK_MODEL || 'deepseek-chat',
  };
}

export async function generateReportViaDeepSeek(params: {
  type: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  daysData: DayData[];
  tags: Tag[];
}): Promise<string> {
  const config = loadEnvConfig();
  if (!config.deepseekApiKey || config.deepseekApiKey === 'your_deepseek_api_key_here') {
    throw new Error('未配置有效 DEEPSEEK_API_KEY。请在项目根目录 .env 文件中填入你的 API Key');
  }

  const { system, user } = buildDeepSeekPrompt(
    params.type,
    params.startDate,
    params.endDate,
    params.daysData,
    params.tags
  );

  return requestDeepSeek(config, system, user);
}
