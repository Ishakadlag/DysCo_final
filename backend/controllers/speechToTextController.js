const path = require('path');
const { Deepgram } = require("@deepgram/sdk");
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const speechToText = async (req, res) => {
    try {
        const file = req.files && req.files.length > 0 ? req.files[0] : req.file;
        const language = req.body.language || 'en';

        if (!file) {
            return res.status(400).json({
                message: 'No audio file provided',
            });
        }

        if (!DEEPGRAM_API_KEY && !OPENAI_API_KEY) {
            return res.status(500).json({
                message: 'Speech-to-text API key not configured. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.',
            });
        }

        const audioSource = { buffer: file.buffer, mimetype: file.mimetype };
        const supportedLanguages = new Set([
            'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar',
            'hi', 'tr', 'pl', 'sv', 'da', 'no', 'fi', 'uk', 'cs', 'sk', 'bg', 'hr',
            'sl', 'et', 'lv', 'lt', 'el', 'he', 'th', 'vi', 'id'
        ]);

        const options = {
            smart_format: true,
        };

        if (supportedLanguages.has(language)) {
            options.language = language;
        } else {
            options.detect_language = true;
            console.warn(`SpeechToText: language '${language}' not recognized; using auto-detect.`);
        }

        let transcript;
        let responseDetails = null;

        if (DEEPGRAM_API_KEY) {
            try {
                const deepgram = new Deepgram(DEEPGRAM_API_KEY);
                const deepgramResponse = await deepgram.transcription.preRecorded(audioSource, options);
                transcript = deepgramResponse?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
                responseDetails = deepgramResponse?.results;
            } catch (firstError) {
                console.warn('Deepgram first attempt failed, retrying without explicit language', firstError);
                try {
                    const deepgram = new Deepgram(DEEPGRAM_API_KEY);
                    const retryOptions = { ...options };
                    delete retryOptions.language;
                    const deepgramResponse = await deepgram.transcription.preRecorded(audioSource, retryOptions);
                    transcript = deepgramResponse?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
                    responseDetails = deepgramResponse?.results;
                } catch (secondError) {
                    console.warn('Deepgram retry failed, falling back to OpenAI if available', secondError);
                }
            }
        }

        if (!transcript && OPENAI_API_KEY) {
            try {
                const formData = new FormData();
                const blob = new Blob([file.buffer], { type: file.mimetype });
                formData.append('file', blob, file.originalname || 'audio.webm');
                formData.append('model', 'whisper-1');
                if (language) {
                    formData.append('language', language);
                }

                const openAiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                    body: formData,
                });

                const openAiResult = await openAiResponse.json();
                if (!openAiResponse.ok) {
                    throw new Error(openAiResult.error?.message || `OpenAI transcription failed with status ${openAiResponse.status}`);
                }
                transcript = openAiResult?.text;
                responseDetails = openAiResult;
            } catch (openAiError) {
                console.error('OpenAI transcription failed:', openAiError);
                return res.status(500).json({
                    message: 'Error transcribing audio with OpenAI',
                    error: openAiError.message
                });
            }
        }

        if (!transcript) {
            return res.status(500).json({
                message: 'Error transcribing audio - no transcript returned',
                detail: responseDetails,
            });
        }

        return res.status(200).json({
            message: 'Speech to text successful',
            transcript,
        });
    } catch (error) {
        console.error('Speech to text error:', error);
        return res.status(500).json({
            message: 'Error transcribing audio',
            error: error.message,
        });
    }
};

module.exports = {
    speechToText,
};
