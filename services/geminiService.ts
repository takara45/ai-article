import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { GroundingSource, PlanType, Tone, Language } from '../types';
import { PlanType as PlanTypeEnum } from '../types';

const getEnv = (name: string): string | undefined => {
  return (import.meta as any).env?.[name] ?? process.env?.[name];
};

const IMAGE_GEN_ENABLED = (getEnv('VITE_IMAGE_GEN_ENABLED') ?? 'true').toLowerCase() !== 'false';

export const isImageGenerationEnabled = () => IMAGE_GEN_ENABLED;

const API_KEY = getEnv('VITE_API_KEY') ?? getEnv('API_KEY');

if (!API_KEY) {
  throw new Error("VITE_API_KEYが設定されていません。");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface ArticleConfig {
    h2Count: number;
    h3Count: number;
    charsPerHeading: number;
    tone: Tone;
    customPrompt: string;
    language?: Language;
}

const getTitlePrompt = (
    planType: PlanType,
    keywords: string,
    targetAudience: string,
    language: Language
): string => {
    const affiliatePrompts = {
        Japanese: `あなたはトップアフィリエイターです。以下の情報に基づいて、読者の好奇心と購買意欲を強く刺激する、クリックしたくなるようなアフィリエイト記事のタイトル案を10個生成してください。`,
        // Other languages can be added here if Affiliate plan supports them
    };
    
    const ownedMediaPrompts = {
        Japanese: `あなたは企業のオウンドメディアを担当するコンテンツマーケターです。以下の情報に基づいて、読者の課題解決に繋がり、信頼性を感じさせるようなSEOに強いブログ記事のタイトル案を10個生成してください。`,
        English: `You are a content marketer for a corporate owned media. Based on the following information, generate 10 SEO-strong blog post title ideas that will help solve readers' problems and convey trustworthiness.`,
        Mandarin: `您是一家企业自有媒体的内容营销人员。请根据以下信息，生成10个有助于解决读者问题并传达可信度的、具有强大SEO效果的博客文章标题建议。`,
        Cantonese: `你係一間企業自有媒體嘅內容營銷人員。請根據以下資訊，生成10個有助於解決讀者問題並傳達可信度、具有強大SEO效果嘅博客文章標題建議。`,
        Korean: `당신은 기업의 온드 미디어를 담당하는 콘텐츠 마케터입니다. 다음 정보를 바탕으로 독자의 문제 해결에 도움이 되고 신뢰성을 전달할 수 있는 SEO에 강한 블로그 게시물 제목 아이디어 10개를 생성해 주세요.`
    };

    const langInstructionBlocks = {
        English: `\n\n**Strict Instruction:** All title suggestions must be written exclusively in English.`,
        Mandarin: `\n\n**严格指示:** 所有标题建议必须完全用普通话（简体中文）撰写。`,
        Cantonese: `\n\n**嚴格指示:** 所有標題建議必須完全用粵語（繁體中文）撰寫。`,
        Korean: `\n\n**엄수 지시:** 모든 제목 제안은 반드시 한국어로만 작성되어야 합니다。`
    };

    const infoBlocks = {
        Japanese: `キーワード: ${keywords}\nターゲット読者: ${targetAudience}`,
        English: `Keywords: ${keywords}\nTarget Audience: ${targetAudience}`,
        Mandarin: `关键词: ${keywords}\n目标读者: ${targetAudience}`,
        Cantonese: `關鍵詞: ${keywords}\n目標讀者: ${targetAudience}`,
        Korean: `키워드: ${keywords}\n타겟 독자: ${targetAudience}`,
    }

    if (planType === PlanTypeEnum.Affiliate) {
        return `${affiliatePrompts.Japanese}\n\n${infoBlocks.Japanese}`;
    }
    
    const langKey = planType === PlanTypeEnum.ForeignLanguage ? language : 'Japanese';
    
    let prompt = `${ownedMediaPrompts[langKey]}\n\n${infoBlocks[langKey]}`;

    if (planType === PlanTypeEnum.ForeignLanguage) {
        prompt += langInstructionBlocks[language];
    }

    return prompt;
}


export const generateTitles = async (
  keywords: string,
  targetAudience: string,
  planType: PlanType,
  language: Language = 'English'
): Promise<string[]> => {
  try {
    const prompt = getTitlePrompt(planType, keywords, targetAudience, language);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
      },
    });
    
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.titles || [];
  } catch (error) {
    console.error("タイトルの生成に失敗しました:", error);
    throw new Error("タイトルの生成中にエラーが発生しました。");
  }
};

// FIX: Added 'affiliate' prompts for all languages to resolve TypeScript error.
const getArticlePrompts = (language: Language | 'Japanese') => {
    const toneMaps = {
        Japanese: {
            Normal: 'ですます調を基本とした、丁寧で分かりやすい通常の文章。',
            Casual: '読者との距離が近い、親しみやすいカジュアルな口語体の文章。',
            Formal: '専門的で権威があり、信頼性を重視したフォーマルで硬質な文章。',
        },
        English: {
            Normal: 'A standard, polite, and easy-to-understand text.',
            Casual: 'A friendly, casual, and colloquial text that feels close to the reader.',
            Formal: 'A professional, authoritative, and formal text that emphasizes reliability.',
        },
        Mandarin: {
            Normal: '以“ですます”语调为基础，礼貌易懂的常规文章。',
            Casual: '与读者距离近、亲切随意的口语体文章。',
            Formal: '专业、权威、重视信赖性的正式书面文章。',
        },
        Cantonese: {
            Normal: '以“ですます”語調為基礎，禮貌易懂嘅常規文章。',
            Casual: '同讀者距離近、親切隨意嘅口語體文章。',
            Formal: '專業、權威、重視信賴性嘅正式書面文章。',
        },
        Korean: {
            Normal: '입니다/습니다 체를 기본으로 한 정중하고 알기 쉬운 일반적인 문장.',
            Casual: '독자와의 거리가 가까운 친근한 캐주얼 구어체 문장.',
            Formal: '전문적이고 권위 있으며 신뢰성을 중시하는 격식 있는 문장.',
        }
    };

    const prompts = {
        Japanese: {
            common: (title: string, keywords: string, targetAudience: string, urls: string[], h2: number, h3: number, chars: number, tone: Tone, custom: string) => `
**記事作成のための基本情報:**
- **記事タイトル:** ${title}
- **キーワード:** ${keywords}
- **ターゲット読者:** ${targetAudience}
${(urls && urls.length > 0) ? `
**最優先の参照URL:**
以下のウェブサイトの情報を最優先の知識ベースとして記事を生成してください:
${urls.map(url => `- ${url.trim()}`).join('\n')}
` : ''}

**共通の厳守要件:**
- **構成:** 導入、本文、まとめの構成を必ず含めてください。本文はH2見出しを**正確に${h2}個**使用し、各H2下にはH3見出しを**最大${h3}個まで**使用してください。
- **文字数:** 各H2セクションの本文は**約${chars}文字**に調整してください。
- **SEO:** キーワード（${keywords}）を戦略的に配置してください。
- **品質:** 文章のトーンは「${tone}」（${toneMaps.Japanese[tone]}）とし、段落は3〜4文で簡潔に、箇条書きも適宜使用してください。
- **メタディスクリプション:** **120文字程度**の魅力的なメタディスクリプションを生成してください。
${custom ? `- **追加の指示:** ${custom}` : ''}`,
            affiliate: `あなたはトップアフィリエイターです。読者の心を動かし購入へ導く説得力の高い記事を生成してください。共感、ベネフィット訴求、信頼性構築、強力なCTAを重視してください。重要な部分は**太字**で強調してください。`,
            ownedMedia: `あなたは経験豊富なコンテンツマーケターです。読者の信頼を獲得しブランド価値を高める高品質な情報記事を生成してください。中立性、客観性を保ち、直接的なセールストークは避けてください。重要な部分は**太字**で強調してください。`,
        },
        English: {
            common: (title: string, keywords: string, targetAudience: string, urls: string[], h2: number, h3: number, chars: number, tone: Tone, custom: string) => `
**Basic Information for Article Creation:**
- **Article Title:** ${title}
- **Keywords:** ${keywords}
- **Target Audience:** ${targetAudience}
${(urls && urls.length > 0) ? `
**Primary Reference URLs:**
Generate the article using the information from the following websites as the primary knowledge base:
${urls.map(url => `- ${url.trim()}`).join('\n')}
` : ''}

**Common Strict Requirements:**
- **Structure:** Must include an Introduction, Main Body, and Conclusion. The main body must use **exactly ${h2} H2 headings**, with up to **${h3} H3 headings** under each H2.
- **Length:** Each H2 section's body text should be approximately **${chars} characters**.
- **SEO:** Strategically place the keywords (${keywords}).
- **Quality:** The tone should be "${tone}" (${toneMaps.English[tone]}). Paragraphs should be 3-4 sentences. Use bullet points where appropriate.
- **Meta Description:** Generate a compelling meta description of about **120 characters**.
${custom ? `- **Additional Instructions:** ${custom}` : ''}

**Strict Instruction:** The entire output, including the article body and meta description, must be written exclusively in English.`,
            affiliate: `You are a top affiliate marketer. Generate a highly persuasive article that moves the reader's heart and leads to purchase. Emphasize empathy, benefit appeal, building trust, and a strong CTA. Emphasize important parts with **bold text**.`,
            ownedMedia: `You are an experienced content marketer. Generate a high-quality informational article that builds reader trust and enhances brand value. Maintain neutrality and objectivity, avoiding direct sales talk. Emphasize important parts with **bold text**.`,
        },
        Mandarin: {
             common: (title: string, keywords: string, targetAudience: string, urls: string[], h2: number, h3: number, chars: number, tone: Tone, custom: string) => `
**文章创作基本信息:**
- **文章标题:** ${title}
- **关键词:** ${keywords}
- **目标读者:** ${targetAudience}
${(urls && urls.length > 0) ? `
**优先参考URL:**
请使用以下网站信息作为首要知识库生成文章:
${urls.map(url => `- ${url.trim()}`).join('\n')}
` : ''}

**共同严格要求:**
- **结构:** 必须包含引言、正文和结论。正文必须使用**恰好${h2}个H2标题**，每个H2下最多使用**${h3}个H3标题**。
- **字数:** 每个H2部分的正文长度约为**${chars}字**。
- **SEO:** 有策略地放置关键词 (${keywords})。
- **质量:** 文章语调应为“${tone}” (${toneMaps.Mandarin[tone]})。段落应为3-4句。适当使用项目符号。
- **元描述:** 生成一个约**120字**的有吸引力的元描述。
${custom ? `- **附加说明:** ${custom}` : ''}

**严格指示:** 包括文章正文和元描述在内的所有输出内容，都必须完全用普通话（简体中文）撰写。`,
            affiliate: `您是一位顶级的联盟营销人员。请撰写一篇具有高度说服力的文章，打动读者并引导其购买。请强调同理心、利益诉求、建立信任和强有力的号召性用语。请用**粗体**强调重要部分。`,
            ownedMedia: `您是一位经验丰富的内容营销人员。请撰写一篇高质量的信息性文章，以建立读者信任并提升品牌价值。保持中立和客观，避免直接的销售宣传。用**粗体**强调重要部分。`,
        },
        Cantonese: {
             common: (title: string, keywords: string, targetAudience: string, urls: string[], h2: number, h3: number, chars: number, tone: Tone, custom: string) => `
**文章創作基本資訊:**
- **文章標題:** ${title}
- **關鍵詞:** ${keywords}
- **目標讀者:** ${targetAudience}
${(urls && urls.length > 0) ? `
**優先參考URL:**
請使用以下網站資訊作為首要知識庫生成文章:
${urls.map(url => `- ${url.trim()}`).join('\n')}
` : ''}

**共同嚴格要求:**
- **結構:** 必須包含引言、正文和結論。正文必須使用**恰好${h2}個H2標題**，每個H2下最多使用**${h3}個H3標題**。
- **字數:** 每個H2部分嘅正文長度約為**${chars}字**。
- **SEO:** 有策略地放置關鍵詞 (${keywords})。
- **品質:** 文章語調應為“${tone}” (${toneMaps.Cantonese[tone]})。段落應為3-4句。適當使用項目符號。
- **元描述:** 生成一個約**120字**嘅有吸引力嘅元描述。
${custom ? `- **附加說明:** ${custom}` : ''}

**嚴格指示:** 包括文章正文同元描述在內嘅所有輸出內容，都必須完全用粵語（繁體中文）撰寫。`,
            affiliate: `你係一位頂級嘅聯盟營銷人員。請撰寫一篇具有高度說服力嘅文章，打動讀者並引導其購買。請強調同理心、利益訴求、建立信任同強有力嘅號召性用語。請用**粗體**強調重要部分。`,
            ownedMedia: `你係一位經驗豐富嘅內容營銷人員。請撰寫一篇高質量嘅資訊性文章，以建立讀者信任並提升品牌價值。保持中立同客觀，避免直接嘅銷售宣傳。用**粗體**強調重要部分。`,
        },
        Korean: {
             common: (title: string, keywords: string, targetAudience: string, urls: string[], h2: number, h3: number, chars: number, tone: Tone, custom: string) => `
**기사 작성 기본 정보:**
- **기사 제목:** ${title}
- **키워드:** ${keywords}
- **타겟 독자:** ${targetAudience}
${(urls && urls.length > 0) ? `
**우선 참조 URL:**
다음 웹사이트의 정보를 최우선 지식 기반으로 사용하여 기사를 생성하십시오:
${urls.map(url => `- ${url.trim()}`).join('\n')}
` : ''}

**공통 엄수 요건:**
- **구조:** 서론, 본문, 결론을 반드시 포함해야 합니다. 본문은 **정확히 ${h2}개의 H2 제목**을 사용하고, 각 H2 아래에는 **최대 ${h3}개의 H3 제목**을 사용하십시오.
- **글자 수:** 각 H2 섹션의 본문은 약 **${chars}자**로 조정하십시오.
- **SEO:** 키워드(${keywords})를 전략적으로 배치하십시오.
- **품질:** 문장의 톤은 "${tone}"(${toneMaps.Korean[tone]})이어야 합니다. 단락은 3-4 문장으로 간결하게 작성하고, 글머리 기호를 적절히 사용하십시오.
- **메타 설명:** 약 **120자**의 매력적인 메타 설명을 생성하십시오.
${custom ? `- **추가 지시사항:** ${custom}` : ''}

**엄수 지시:** 기사 본문과 메타 설명을 포함한 모든 출력물은 반드시 한국어로만 작성되어야 합니다.`,
            affiliate: `당신은 최고의 제휴 마케터입니다. 독자의 마음을 움직여 구매로 이어지는 설득력 있는 기사를 작성해 주세요. 공감, 혜택 소구, 신뢰 구축, 강력한 CTA를 강조해 주세요. 중요한 부분은 **굵은 글씨**로 강조해 주세요.`,
            ownedMedia: `당신은 숙련된 콘텐츠 마케터입니다. 독자의 신뢰를 구축하고 브랜드 가치를 높이는 고품질 정보 기사를 작성하십시오. 중립성과 객관성을 유지하고 직접적인 판매 홍보를 피하십시오. 중요한 부분은 **굵은 글씨**로 강조하십시오.`,
        }
    };
    return prompts[language];
}


export const generateArticle = async (
  title: string,
  keywords: string,
  targetAudience: string,
  planType: PlanType,
  referenceUrls?: string[],
  referenceText?: string,
  articleConfig: ArticleConfig = { h2Count: 3, h3Count: 2, charsPerHeading: 300, tone: 'Normal', customPrompt: '', language: 'English' },
): Promise<{ articleText: string; sources: GroundingSource[]; metaDescription: string }> => {
  try {
    const { h2Count, h3Count, charsPerHeading, tone, customPrompt, language = 'English' } = articleConfig;
    const currentLang = planType === PlanTypeEnum.ForeignLanguage ? language : 'Japanese';
    const prompts = getArticlePrompts(currentLang);
    const urls = referenceUrls || [];
    
    let basePrompt: string;

    const commonPrompt = prompts.common(title, keywords, targetAudience, urls, h2Count, h3Count, charsPerHeading, tone, customPrompt);
    
    if (planType === PlanTypeEnum.Affiliate) {
        basePrompt = `${prompts.affiliate}\n${commonPrompt}`;
    } else { // Normal, Expert, ForeignLanguage
        basePrompt = `${prompts.ownedMedia}\n${commonPrompt}`;
    }
    
    let articleText: string;
    let metaDescription: string;
    let sources: GroundingSource[] = [];

    if (planType === PlanTypeEnum.Normal || planType === PlanTypeEnum.Affiliate || planType === PlanTypeEnum.ForeignLanguage) {
        const finalInstructions = {
            Japanese: `信頼できる情報源を基に、正確で最新の情報を提供してください。\n\n**出力形式:**\nまず記事本文（マークダウン形式）を記述し、その後に必ず区切り線として「---meta---」を挿入し、最後にメタディスクリプションを記述してください。この形式を厳守してください。`,
            English: `Provide accurate and up-to-date information based on reliable sources.\n\n**Output Format:**\nFirst, write the article body (in Markdown format), then insert "---meta---" as a separator, and finally, write the meta description. Strictly adhere to this format.`,
            Mandarin: `请根据可靠来源提供准确和最新的信息。\n\n**输出格式:**\n首先，撰写文章正文（Markdown格式），然后插入“---meta---”作为分隔符，最后撰写元描述。请严格遵守此格式。`,
            Cantonese: `請根據可靠來源提供準確同最新嘅資訊。\n\n**輸出格式:**\n首先，撰寫文章正文（Markdown格式），然後插入“---meta---”作為分隔符，最後撰寫元描述。請嚴格遵守此格式。`,
            Korean: `신뢰할 수 있는 출처를 바탕으로 정확하고 최신 정보를 제공하십시오.\n\n**출력 형식:**\n먼저 기사 본문(마크다운 형식)을 작성한 다음 "---meta---"를 구분 기호로 삽입하고 마지막으로 메타 설명을 작성하십시오. 이 형식을 엄격히 준수하십시오.`
        };
        
        const prompt = basePrompt + `\n${finalInstructions[currentLang]}`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const responseText = response.text.trim();
        const parts = responseText.split('---meta---');
        articleText = parts[0]?.trim() ?? '';
        
        const metaDescriptionFallbacks = {
            Japanese: 'メタディスクリプションの生成に失敗しました。',
            English: 'Failed to generate meta description.',
            Mandarin: '元描述生成失败。',
            Cantonese: '元描述生成失敗。',
            Korean: '메타 설명 생성에 실패했습니다.'
        };
        metaDescription = parts[1]?.trim() ?? metaDescriptionFallbacks[currentLang];


        if (!articleText) {
            articleText = responseText; // In case the separator is missing
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        sources = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Untitled Source',
            }))
            .filter((source: GroundingSource) => source.uri);

    } else { // Expert Plan
        let prompt = basePrompt;
        if (referenceText) {
            prompt += `\n**最優先の知識ベース (添付資料):**\n以下の参考情報を最優先の知識ベースとして記事を生成してください:\n---\n${referenceText}\n---`;
        }
        
        prompt += `
**出力形式:**
記事本文（マークダウン形式）とメタディスクリプションを、必ず以下のJSON形式で出力してください。
{
  "article": "（ここに記事本文を記述）",
  "metaDescription": "（ここにメタディスクリプションを記述）"
}
`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        article: { type: Type.STRING },
                        metaDescription: { type: Type.STRING }
                    },
                    required: ["article", "metaDescription"]
                }
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        articleText = result.article;
        metaDescription = result.metaDescription;
    }

    return { articleText, sources, metaDescription };

  } catch (error) {
    console.error("記事の生成に失敗しました:", error);
    throw new Error("記事の生成中にエラーが発生しました。");
  }
};

export const generateImage = async (title: string): Promise<string> => {
  if (!IMAGE_GEN_ENABLED) {
    throw new Error('画像生成は無効化されています（VITE_IMAGE_GEN_ENABLED=false）');
  }
  try {
    const prompt = `A professional, high-quality, photorealistic image for a blog post titled "${title}". The image should be visually appealing, clean, and modern. Focus purely on the visual theme.`;
    
    const tryGenerate = async (mime: 'image/png' | 'image/jpeg') => {
      return ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: mime,
          outputImageSize: '1024x576', // 16:9の軽量サイズ（約HD）
        },
      });
    };

    // まずjpegを試し、失敗したらpngにフォールバック（API対応mimeのみ）
    let response = await tryGenerate('image/jpeg');
    if (!response.generatedImages?.[0]?.image?.imageBytes) {
      response = await tryGenerate('image/png');
    }

    const img = response.generatedImages?.[0]?.image?.imageBytes;
    const mimeType = response.generatedImages?.[0]?.mimeType ?? 'image/jpeg';

    if (img) {
      return `data:${mimeType};base64,${img}`;
    }

    console.error("画像生成APIは成功しましたが、画像データが含まれていませんでした。", response);
    throw new Error('画像が生成されませんでした。安全フィルターが作動した可能性があります。');
  } catch (error) {
    console.error("アイキャッチ画像の生成に失敗しました:", error);
    throw new Error("アイキャッチ画像の生成中にAPIエラーが発生しました。時間をおいて再試行してください。");
  }
};

export const generateHeadingImages = async (headings: string[]): Promise<{ heading: string; imageBase64: string; }[]> => {
  if (!IMAGE_GEN_ENABLED) return [];
  try {
    const limitedHeadings = headings.slice(0, 5); // 上限5件
    const imagePromises = limitedHeadings.map(heading => {
      const prompt = `A professional, high-quality, photorealistic image for a blog post heading titled "${heading}". The image should be visually appealing, clean, and modern. Crucially, the image must NOT contain any text, letters, characters, or symbols.`;
      return ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9', // アイキャッチと同じ比率に変更
          outputMimeType: 'image/jpeg',
          outputImageSize: '1024x576',
        },
      }).then(response => {
        const img = response.generatedImages?.[0]?.image?.imageBytes ?? '';
        const mimeType = response.generatedImages?.[0]?.mimeType ?? 'image/jpeg';
        if (img) {
          return { heading, imageBase64: `data:${mimeType};base64,${img}` };
        }
        return { heading, imageBase64: '' }; 
      });
    });

    const results = await Promise.all(imagePromises);
    return results.filter(result => result.imageBase64);
  } catch (error) {
    console.error("H2見出し画像の生成に失敗しました:", error);
    return [];
  }
};
