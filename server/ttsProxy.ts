import { VoiceProviderType, VoiceOption } from '../src/types/magiao';

export interface ServerTTSRequest {
  text: string;
  provider: VoiceProviderType;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  azureKey?: string;
  azureRegion?: string;
  vieneuUrl?: string;
}

export interface ServerTTSResponse {
  success: boolean;
  providerUsed: VoiceProviderType;
  audioBase64?: string;
  mimeType?: string;
  error?: string;
  fallbackToBrowser?: boolean;
  rateLimited?: boolean;
  retryAfterMs?: number;
}

// Runtime overrides so local desktop operators can test/save Azure or VieNeu credentials via Admin UI
let runtimeAzureSpeechKey = '';
let runtimeAzureSpeechRegion = '';
let runtimeVieneuLocalUrl = '';

export function setRuntimeTTSCredentials(creds: {
  azureKey?: string;
  azureRegion?: string;
  vieneuLocalUrl?: string;
}) {
  if (typeof creds.azureKey === 'string') runtimeAzureSpeechKey = creds.azureKey.trim();
  if (typeof creds.azureRegion === 'string') runtimeAzureSpeechRegion = creds.azureRegion.trim();
  if (typeof creds.vieneuLocalUrl === 'string') runtimeVieneuLocalUrl = creds.vieneuLocalUrl.trim();
}

export function getAvailableVoiceOptions(): {
  providers: Record<VoiceProviderType, { configured: boolean; statusText: string; voices: VoiceOption[] }>;
} {
  const azureKey = runtimeAzureSpeechKey || (process.env.AZURE_SPEECH_KEY || '').trim();
  const azureRegion = runtimeAzureSpeechRegion || (process.env.AZURE_SPEECH_REGION || 'southeastasia').trim();
  const vieneuUrl = (process.env.VIENEU_TTS_URL || '').trim();
  const vieneuLocalUrl = runtimeVieneuLocalUrl || (process.env.VIENEU_LOCAL_URL || 'http://127.0.0.1:8000').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const elevenKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

  return {
    providers: {
      azure_speech: {
        configured: Boolean(azureKey && azureRegion),
        statusText: azureKey
          ? `Đã kết nối Microsoft Azure Speech (${azureRegion})`
          : 'Chưa cấu hình AZURE_SPEECH_KEY (hỗ trợ nhập trong Admin hoặc .env)',
        voices: [
          {
            id: 'vi-VN-NamMinhNeural',
            name: 'Microsoft Nam Minh Online (Natural) - Vietnamese (Vietnam)',
            provider: 'azure_speech',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng Nam Minh Neural chuẩn tiếng Việt tự nhiên, uy nghiêm trầm ấm cho Giáo Chủ',
          },
          {
            id: 'vi-VN-HoaiMyNeural',
            name: 'Microsoft Hoài My Online (Natural) - Vietnamese (Vietnam)',
            provider: 'azure_speech',
            lang: 'vi-VN',
            gender: 'female',
            description: 'Giọng Hoài My Neural chuẩn tiếng Việt tự nhiên, sắc sảo truyền cảm',
          },
        ],
      },
      vieneu_local: {
        configured: Boolean(vieneuLocalUrl),
        statusText: `VieNeu-TTS Local (${vieneuLocalUrl})`,
        voices: [
          {
            id: 'Bình (nam miền Bắc)',
            name: 'VieNeu Local - Bình (Nam Miền Bắc - Giáo Chủ)',
            provider: 'vieneu_local',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng nam miền Bắc trầm hùng chạy trên VieNeu Local 127.0.0.1:8000',
          },
          {
            id: 'Tuyên (nam miền Bắc)',
            name: 'VieNeu Local - Tuyên (Nam Miền Bắc - Hộ Pháp)',
            provider: 'vieneu_local',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng nam mạnh mẽ dứt khoát',
          },
          {
            id: 'Vĩnh (nam miền Nam)',
            name: 'VieNeu Local - Vĩnh (Nam Miền Nam)',
            provider: 'vieneu_local',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng nam miền Nam hào sảng hài hước',
          },
        ],
      },
      vieneu: {
        configured: Boolean(vieneuUrl),
        statusText: vieneuUrl ? 'Đã cấu hình VieNeu Cloud API' : 'Chưa cấu hình VIENEU_TTS_URL',
        voices: [
          {
            id: 'vieneu-sect-leader-01',
            name: 'VieNeu Cloud - Giọng Giáo Chủ Trầm Hùng',
            provider: 'vieneu',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng tiếng Việt chuyên biệt từ VieNeu Cloud',
          },
        ],
      },
      gemini_tts: {
        configured: Boolean(geminiKey),
        statusText: geminiKey ? 'Đã cấu hình Gemini 2.5 Flash TTS' : 'Chưa cấu hình GEMINI_API_KEY',
        voices: [
          {
            id: 'Charon',
            name: 'Gemini Charon (Trầm Uy Nghiêm)',
            provider: 'gemini_tts',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng trầm dày phù hợp Giáo Chủ',
          },
          {
            id: 'Puck',
            name: 'Gemini Puck (Hài Hước Linh Hoạt)',
            provider: 'gemini_tts',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng hoạt bát dí dỏm',
          },
        ],
      },
      elevenlabs: {
        configured: Boolean(elevenKey),
        statusText: elevenKey ? 'Đã cấu hình ElevenLabs' : 'Chưa cấu hình ELEVENLABS_API_KEY',
        voices: [
          {
            id: 'pNInz6obpgDQGcFmaJgB',
            name: 'ElevenLabs Adam Multilingual v2',
            provider: 'elevenlabs',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng nam đa ngôn ngữ hỗ trợ tiếng Việt',
          },
        ],
      },
      openai: {
        configured: Boolean(openaiKey),
        statusText: openaiKey ? 'Đã cấu hình OpenAI Audio' : 'Chưa cấu hình OPENAI_API_KEY',
        voices: [
          {
            id: 'onyx',
            name: 'OpenAI Onyx (Trầm Ấm)',
            provider: 'openai',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng Onyx trầm hùng',
          },
        ],
      },
      web_speech: {
        configured: true,
        statusText: 'Sẵn sàng trên trình duyệt (Web Speech API Fallback)',
        voices: [
          {
            id: 'vi-VN-Standard-Male',
            name: 'Web Speech Tiếng Việt (Trình duyệt)',
            provider: 'web_speech',
            lang: 'vi-VN',
            gender: 'male',
            description: 'Giọng đọc trực tiếp trên trình duyệt không cần API key',
          },
        ],
      },
    },
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function synthesizeAzureSpeech(req: ServerTTSRequest): Promise<ServerTTSResponse> {
  const key = (req.azureKey || runtimeAzureSpeechKey || process.env.AZURE_SPEECH_KEY || '').trim();
  const region = (req.azureRegion || runtimeAzureSpeechRegion || process.env.AZURE_SPEECH_REGION || 'southeastasia').trim();

  if (!key) {
    return {
      success: false,
      providerUsed: 'azure_speech',
      error: 'AZURE_SPEECH_KEY chưa được cấu hình. Đang chuyển sang giọng dự phòng.',
      fallbackToBrowser: true,
    };
  }

  const voiceName = req.voiceId === 'vi-VN-HoaiMyNeural' ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
  const speedRatio = Math.max(0.5, Math.min(2.0, Number(req.speed || 1.0)));
  const ratePct = Math.round((speedRatio - 1.0) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

  const ssml = `<speak version='1.0' xml:lang='vi-VN'>
    <voice xml:lang='vi-VN' name='${voiceName}'>
      <prosody rate='${rateStr}'>${escapeXml(req.text)}</prosody>
    </voice>
  </speak>`;

  try {
    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'MaGiaoOnline-TTSProxy',
      },
      body: ssml,
    });

    if (response.status === 429) {
      return {
        success: false,
        providerUsed: 'azure_speech',
        error: 'Microsoft Azure Speech đang giới hạn tần suất (429).',
        fallbackToBrowser: true,
        rateLimited: true,
        retryAfterMs: 10000,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        providerUsed: 'azure_speech',
        error: `Azure Speech trả về mã lỗi ${response.status}: ${errText.slice(0, 140)}`,
        fallbackToBrowser: true,
      };
    }

    const arrayBuf = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');
    return {
      success: true,
      providerUsed: 'azure_speech',
      audioBase64: base64,
      mimeType: 'audio/mpeg',
    };
  } catch (err) {
    return {
      success: false,
      providerUsed: 'azure_speech',
      error: err instanceof Error ? err.message : 'Lỗi kết nối Azure Speech',
      fallbackToBrowser: true,
    };
  }
}

async function synthesizeVieneuLocal(req: ServerTTSRequest): Promise<ServerTTSResponse> {
  const baseUrl = (req.vieneuUrl || runtimeVieneuLocalUrl || process.env.VIENEU_LOCAL_URL || 'http://127.0.0.1:8000')
    .trim()
    .replace(/\/+$/, '');

  // Cloud environment guard: if running on remote container without local VieNeu service, fail fast cleanly
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'vieneu-tts',
        input: req.text,
        voice: req.voiceId || 'Bình (nam miền Bắc)',
        speed: req.speed || 1.0,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        providerUsed: 'vieneu_local',
        error: `VieNeu Local phản hồi HTTP ${response.status}`,
        fallbackToBrowser: true,
      };
    }

    const buf = Buffer.from(await response.arrayBuffer());
    return {
      success: true,
      providerUsed: 'vieneu_local',
      audioBase64: buf.toString('base64'),
      mimeType: 'audio/mpeg',
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      providerUsed: 'vieneu_local',
      error: err instanceof Error ? err.message : 'Không kết nối được VieNeu Local (127.0.0.1:8000)',
      fallbackToBrowser: true,
    };
  }
}

export async function synthesizeServerTTS(req: ServerTTSRequest): Promise<ServerTTSResponse> {
  const cleanText = String(req.text || '')
    .replace(/[{}]/g, '')
    .trim();

  if (!cleanText) {
    return {
      success: false,
      providerUsed: req.provider,
      error: 'Nội dung lời thoại trống.',
      fallbackToBrowser: true,
    };
  }

  if (req.provider === 'azure_speech') {
    return synthesizeAzureSpeech({ ...req, text: cleanText });
  }

  if (req.provider === 'vieneu_local') {
    return synthesizeVieneuLocal({ ...req, text: cleanText });
  }

  if (req.provider === 'vieneu') {
    const url = (process.env.VIENEU_TTS_URL || '').trim();
    if (!url) {
      return {
        success: false,
        providerUsed: 'vieneu',
        error: 'Chưa cấu hình VIENEU_TTS_URL.',
        fallbackToBrowser: true,
      };
    }
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.VIENEU_API_KEY ? { Authorization: `Bearer ${process.env.VIENEU_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          text: cleanText,
          voiceId: req.voiceId || 'vieneu-sect-leader-01',
          speed: req.speed || 1.0,
        }),
      });
      if (!resp.ok) {
        return {
          success: false,
          providerUsed: 'vieneu',
          error: `VieNeu Cloud lỗi ${resp.status}`,
          fallbackToBrowser: true,
        };
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      return {
        success: true,
        providerUsed: 'vieneu',
        audioBase64: buf.toString('base64'),
        mimeType: 'audio/mpeg',
      };
    } catch (e) {
      return {
        success: false,
        providerUsed: 'vieneu',
        error: e instanceof Error ? e.message : 'Lỗi VieNeu Cloud',
        fallbackToBrowser: true,
      };
    }
  }

  return {
    success: false,
    providerUsed: req.provider || 'web_speech',
    fallbackToBrowser: true,
    error: 'Sử dụng giọng đọc trình duyệt (Web Speech API).',
  };
}
