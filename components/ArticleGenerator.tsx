import React, { useState, useCallback, useMemo } from 'react';
import type { Plan, Article, WordPressCredentials, GroundingSource, Tone, HeadingImage, Language } from '../types';
import { PlanType } from '../types';
import { generateTitles, generateArticle, generateImage, generateHeadingImages } from '../services/geminiService';
import { ArrowLeftIcon, SparklesIcon, ChevronRightIcon, DocumentArrowUpIcon, PhotoIcon, CodeBracketIcon, EyeIcon, ArrowPathIcon } from './icons/Icons';
import PostToWordPressModal from './PostToWordPressModal';
import { marked } from 'marked';
import { saveArticle } from '../services/articleRepository';
import { isWpProxyConfigured } from '../services/wordpressService';

type Step = 'keywords' | 'titles' | 'editor';
type EditorView = 'preview' | 'markdown' | 'html';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const loadingMessages = [
    "Webから最新情報を収集中...",
    "信頼性の高い専門サイトを参照中...",
    "記事の構成を組み立て中...",
    "SEOに最適化しています...",
    "もうすぐ完了します...",
];

interface ArticleGeneratorProps {
  plan: Plan;
  onBack: () => void;
  onArticleGenerated: (article: Article) => void;
  wpCredentials: WordPressCredentials;
  userId?: string;
}

const ArticleGenerator: React.FC<ArticleGeneratorProps> = ({ plan, onBack, onArticleGenerated, wpCredentials, userId }) => {
  const wpProxyEnabled = isWpProxyConfigured();
  const [step, setStep] = useState<Step>('keywords');
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [articleContent, setArticleContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const [editorView, setEditorView] = useState<EditorView>('preview');
  const [eyecatchImage, setEyecatchImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [headingImages, setHeadingImages] = useState<HeadingImage[]>([]);
  const [isHeadingImagesLoading, setIsHeadingImagesLoading] = useState(false);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [h2Count, setH2Count] = useState(3);
  const [h3Count, setH3Count] = useState(2);
  const [charsPerHeading, setCharsPerHeading] = useState(400);
  const [tone, setTone] = useState<Tone>('Normal');
  const [customPrompt, setCustomPrompt] = useState('');

  // Foreign Language Plan setting
  const [language, setLanguage] = useState<Language>('English');


  React.useEffect(() => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;
    }
  }, []);
  
  React.useEffect(() => {
    let interval: number;
    if (isLoading && step === 'titles') {
      let i = 0;
      interval = window.setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, step]);
  
  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setReferenceText('');
      setFileName(null);
      setError(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください。');
      return;
    }

    setIsParsing(true);
    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      setReferenceText(fullText.trim());
    } catch (e) {
      console.error('PDFの解析に失敗しました:', e);
      setError('PDFの解析に失敗しました。ファイルが破損しているか、サポートされていない形式の可能性があります。');
      setFileName(null);
      setReferenceText('');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isParsing) return;
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileChange(e.dataTransfer.files[0]);
      }
  }, [handleFileChange, isParsing]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleGenerateTitles = useCallback(async () => {
    if (!keywords.trim()) {
      setError('キーワードを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const generated = await generateTitles(keywords, targetAudience, plan.type, language);
      setTitles(generated);
      setStep('titles');
    } catch (e) {
      setError('タイトルの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, [keywords, targetAudience, plan.type, language]);

  const handleGenerateArticle = useCallback(async () => {
    if (!selectedTitle) {
      setError('タイトルを選択してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEyecatchImage(null);
    setImageError(null);
    setHeadingImages([]);
    setLoadingMessage(loadingMessages[0]);
    try {
      const urls = referenceUrls.split('\n').filter(url => url.trim() !== '');
      const { articleText, sources: fetchedSources, metaDescription: fetchedMetaDescription } = await generateArticle(
        selectedTitle, 
        keywords, 
        targetAudience, 
        plan.type, 
        urls,
        referenceText,
        { h2Count, h3Count, charsPerHeading, tone, customPrompt, language }
      );
      setArticleContent(articleText);
      setMetaDescription(fetchedMetaDescription);
      setSources(fetchedSources);
      setStep('editor');

      // アイキャッチ画像生成
      setIsImageLoading(true);
      setImageError(null);
      generateImage(selectedTitle).then(imageData => {
        setEyecatchImage(imageData);
      }).catch(imgErr => {
        setImageError((imgErr as Error).message || 'アイキャッチ画像の生成に失敗しました。');
      }).finally(() => {
        setIsImageLoading(false);
      });
      
      // H2見出し画像生成
      const h2Regex = /^## (.*$)/gm;
      const extractedHeadings = [...articleText.matchAll(h2Regex)].map(match => match[1].trim());

      if (extractedHeadings.length > 0) {
        setIsHeadingImagesLoading(true);
        generateHeadingImages(extractedHeadings)
          .then(images => {
            setHeadingImages(images);
          })
          .catch(err => {
            console.error("見出し画像の生成中にエラー:", err);
          })
          .finally(() => {
            setIsHeadingImagesLoading(false);
          });
      }

    } catch (e) {
      setError('記事の生成に失敗しました。もう一度お試しください。');
      setIsLoading(false);
    } finally {
      // setIsLoading(false) is handled in the main logic path to allow background image generation
    }
  }, [selectedTitle, keywords, targetAudience, plan.type, referenceUrls, referenceText, h2Count, h3Count, charsPerHeading, tone, customPrompt, language]);

  const handleRegenerateImage = useCallback(async () => {
    if (!selectedTitle) return;
    setIsImageLoading(true);
    setImageError(null);
    try {
      const imageData = await generateImage(selectedTitle);
      setEyecatchImage(imageData);
    } catch (e) {
      setImageError((e as Error).message || 'アイキャッチ画像の生成に失敗しました。');
    } finally {
      setIsImageLoading(false);
    }
  }, [selectedTitle]);

  const articleHtml = useMemo(() => {
    if (step !== 'editor') return '';
    
    const renderer = new marked.Renderer();

    renderer.strong = (token: any) => `<b>${token.text}</b>`;
    
    const originalHeading = renderer.heading.bind(renderer);

    renderer.heading = (token: any) => {
      const originalHtml = originalHeading(token);
      if (token.depth === 2) {
        const headingImage = headingImages.find(img => img.heading === token.text.trim());
        if (headingImage) {
          return `
            ${originalHtml}
            <img 
              src="data:image/jpeg;base64,${headingImage.imageBase64}" 
              alt="${token.text}" 
              style="aspect-ratio: 16/9; object-fit: cover; width: 100%; border-radius: 8px; margin-top: 1em; margin-bottom: 1em;" 
            />
          `;
        }
      }
      return originalHtml;
    };

    return marked(articleContent, { renderer }) as string;
  }, [articleContent, step, headingImages]);


  const handlePostComplete = (status: '下書き' | '投稿済み') => {
    const newArticle: Article = {
      id: new Date().toISOString(),
      title: selectedTitle,
      content: articleContent,
      htmlContent: articleHtml,
      createdAt: new Date(),
      status,
      plan,
      sources,
      eyecatchImage: eyecatchImage || undefined,
      metaDescription,
      headingImages,
      userId,
    };
    onArticleGenerated(newArticle);
    // 保存は非同期で行い、失敗しても画面遷移は継続する
    saveArticle(newArticle, userId).catch((err) => {
      console.error('Supabaseへの記事保存に失敗しました:', err);
    });
    onBack();
  };

  const handleSaveDraft = () => {
    handlePostComplete('下書き');
  };


  const Stepper = () => (
    <ol className="flex items-center w-full max-w-2xl mx-auto mb-8">
      {['キーワード', 'タイトル選択', '記事生成・編集'].map((stepName, index) => {
        const stepIndex = ['keywords', 'titles', 'editor'].indexOf(step);
        const isCompleted = index < stepIndex;
        const isCurrent = index === stepIndex;
        return (
          <li key={stepName} className={`flex w-full items-center ${index !== 2 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-slate-300 after:border-1 after:inline-block" : ""}`}>
            <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${isCurrent ? 'bg-sky-600 text-white' : isCompleted ? 'bg-sky-200 text-sky-700' : 'bg-slate-200 text-slate-600'}`}>
              {index + 1}
            </span>
            <span className={`ml-2 hidden sm:inline-block ${isCurrent ? 'font-semibold' : ''}`}>{stepName}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center mb-6">
        <button onClick={step === 'keywords' ? onBack : () => setStep('keywords')} className="p-2 rounded-full hover:bg-slate-100 mr-4">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">{plan.name}で記事を生成</h2>
          <p className="text-slate-500">ステップに沿って情報を入力してください。</p>
        </div>
      </div>
      
      <Stepper />

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}

      {step === 'keywords' && (
        <div className="space-y-6">
          {plan.type === PlanType.ForeignLanguage && (
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">言語</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
              >
                <option value="English">英語</option>
                <option value="Mandarin">中国語 (北京語)</option>
                <option value="Cantonese">中国語 (広東語)</option>
                <option value="Korean">韓国語</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-slate-700 mb-1">キーワード (複数可)</label>
            <textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例: 相続放棄 手続き, オンライン診療 メリット"
              className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-slate-700 mb-1">ターゲット読者 (任意)</label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例: 初めて相続を経験する方, 忙しいビジネスパーソン"
              className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label htmlFor="referenceUrls" className="block text-sm font-medium text-slate-700 mb-1">参照したいサイトのURL (任意)</label>
            <textarea
              id="referenceUrls"
              value={referenceUrls}
              onChange={(e) => setReferenceUrls(e.target.value)}
              placeholder="https://example.com/page1&#10;https://example.com/page2"
              className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">1行に1つのURLを入力してください。入力されたサイトの情報を優先的に参考にします。</p>
          </div>

           {/* Advanced Settings */}
           <div className="bg-slate-50 border border-slate-200 rounded-md">
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 text-left font-medium text-slate-700 flex justify-between items-center"
            >
                <span>詳細設定</span>
                <ChevronRightIcon className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
            </button>
            {showAdvanced && (
                <div className="p-4 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="h2Count" className="block text-xs font-medium text-slate-600 mb-1">H2見出しの数</label>
                            <input type="number" id="h2Count" value={h2Count} onChange={e => setH2Count(Math.max(1, parseInt(e.target.value)))} className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="h3Count" className="block text-xs font-medium text-slate-600 mb-1">H3見出しの数 (各H2内)</label>
                            <input type="number" id="h3Count" value={h3Count} onChange={e => setH3Count(Math.max(0, parseInt(e.target.value)))} className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="charsPerHeading" className="block text-xs font-medium text-slate-600 mb-1">文字数 (各H2毎)</label>
                            <input type="number" id="charsPerHeading" value={charsPerHeading} step="50" onChange={e => setCharsPerHeading(Math.max(100, parseInt(e.target.value)))} className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">文章のトーン</label>
                        <select value={tone} onChange={e => setTone(e.target.value as Tone)} className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md">
                            <option value="Normal">通常</option>
                            <option value="Casual">カジュアル</option>
                            <option value="Formal">フォーマル</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="customPrompt" className="block text-xs font-medium text-slate-600 mb-1">追加プロンプト (任意)</label>
                        <textarea id="customPrompt" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={3} placeholder="例: 具体的な事例を多く含めてください。" className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm"></textarea>
                    </div>
                </div>
            )}
            </div>

          {plan.type === PlanType.Expert && (
            <div>
              <label htmlFor="referenceText" className="block text-sm font-medium text-slate-700 mb-1">参考資料</label>
               <div className="mt-2">
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`border-2 border-dashed border-slate-300 rounded-lg p-6 text-center transition-colors ${isParsing ? 'bg-slate-100' : 'hover:border-sky-500 bg-slate-50'}`}
                >
                    <input
                        type="file"
                        id="pdf-upload"
                        className="hidden"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                        disabled={isParsing}
                    />
                    <label htmlFor="pdf-upload" className={isParsing ? 'cursor-wait' : 'cursor-pointer'}>
                        <DocumentArrowUpIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                        {isParsing ? (
                            <p className="text-sm text-slate-600">PDFを解析中...</p>
                        ) : fileName ? (
                            <div>
                                <p className="text-sm text-green-600 font-semibold">{fileName}</p>
                                <p className="text-xs text-slate-500 mt-1">クリックまたはドラッグ＆ドロップでファイルを変更</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">ここにPDFをドラッグ＆ドロップするか、クリックしてファイルを選択</p>
                        )}
                    </label>
                </div>
              </div>
              <textarea
                id="referenceText"
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="記事生成の基にしたい専門的な情報や、お手持ちの資料のテキストをここに貼り付けてください。PDFをアップロードすると、内容がここに反映されます。"
                className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 transition mt-2"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">この内容はWeb検索よりも優先して記事生成に利用されます。</p>
            </div>
          )}
          <button
            onClick={handleGenerateTitles}
            disabled={isLoading}
            className="w-full bg-sky-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-sky-700 transition-colors flex items-center justify-center disabled:bg-slate-400"
          >
            {isLoading ? '生成中...' : 'タイトル案を生成'}
            {!isLoading && <SparklesIcon className="w-5 h-5 ml-2" />}
          </button>
        </div>
      )}

      {step === 'titles' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">タイトルを選択してください</h3>
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">{loadingMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {titles.map((title, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedTitle(title)}
                  className={`p-4 border rounded-md cursor-pointer transition ${selectedTitle === title ? 'bg-sky-100 border-sky-500 ring-2 ring-sky-500' : 'border-slate-300 hover:border-sky-400'}`}
                >
                  {title}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-4">
             <button
                onClick={handleGenerateTitles}
                disabled={isLoading}
                className="text-sm text-sky-600 hover:underline disabled:text-slate-400"
              >
                再生成する
              </button>
            <button
              onClick={handleGenerateArticle}
              disabled={isLoading || !selectedTitle}
              className="bg-sky-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-sky-700 transition-colors flex items-center justify-center disabled:bg-slate-400"
            >
              {isLoading ? '生成中...' : '記事を生成する'}
              {!isLoading && <ChevronRightIcon className="w-5 h-5 ml-2" />}
            </button>
          </div>
        </div>
      )}
      
      {step === 'editor' && (
        <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">{selectedTitle}</h3>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700">アイキャッチ画像</h4>
              <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                  </div>
                )}
                {eyecatchImage && !isImageLoading && (
                  <img src={`data:image/jpeg;base64,${eyecatchImage}`} alt="アイキャッチ画像" className="w-full h-full object-cover" />
                )}
                {!eyecatchImage && !isImageLoading && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <PhotoIcon className="w-12 h-12 mb-2" />
                    {imageError ? <span className="text-red-500 text-sm">{imageError}</span> : <span>画像の生成に失敗しました</span>}
                  </div>
                )}
              </div>
              <div className="text-right">
                <button
                  onClick={handleRegenerateImage}
                  disabled={isImageLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${isImageLoading ? 'animate-spin' : ''}`} />
                  再生成
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700">H2見出しの画像</h4>
              {isHeadingImagesLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                  {[...Array(h2Count)].map((_, i) => (
                    <div key={i} className="aspect-[16/9] bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                    </div>
                  ))}
                </div>
              )}
              {!isHeadingImagesLoading && headingImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                  {headingImages.map(({ heading, imageBase64 }) => (
                    <div key={heading}>
                      <img src={`data:image/jpeg;base64,${imageBase64}`} alt={heading} className="w-full h-auto object-cover rounded-lg aspect-[16/9] border" />
                      <p className="text-xs text-slate-600 mt-1">{heading}</p>
                    </div>
                  ))}
                </div>
              )}
               {!isHeadingImagesLoading && headingImages.length === 0 && <p className="text-sm text-slate-500 mt-2">見出し画像の生成に失敗したか、対象の見出しがありませんでした。</p>}
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-2">メタディスクリプション</h4>
              <p className="text-sm p-3 bg-slate-50 border rounded-md text-slate-800">{metaDescription}</p>
            </div>


            <div>
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setEditorView('preview')} className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${editorView === 'preview' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            <EyeIcon className="w-5 h-5 mr-2" /> プレビュー
                        </button>
                        <button onClick={() => setEditorView('markdown')} className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${editorView === 'markdown' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            <SparklesIcon className="w-5 h-5 mr-2" /> Markdown
                        </button>
                         <button onClick={() => setEditorView('html')} className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${editorView === 'html' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            <CodeBracketIcon className="w-5 h-5 mr-2" /> HTML
                        </button>
                    </nav>
                </div>
                <div className="mt-4">
                    {editorView === 'preview' && (
                        <div className="prose max-w-none p-4 border border-slate-200 rounded-md h-96 overflow-y-auto bg-white" dangerouslySetInnerHTML={{ __html: articleHtml }} />
                    )}
                    {editorView === 'markdown' && (
                        <textarea
                            value={articleContent}
                            onChange={(e) => setArticleContent(e.target.value)}
                            className="w-full p-4 border border-slate-200 rounded-md h-96 overflow-y-auto bg-slate-50 text-sm font-mono whitespace-pre-wrap focus:ring-sky-500 focus:border-sky-500 transition"
                            aria-label="記事のMarkdown編集エリア"
                        />
                    )}
                    {editorView === 'html' && (
                         <pre className="p-4 border border-slate-200 rounded-md h-96 overflow-y-auto bg-slate-50 text-sm"><code className='whitespace-pre-wrap'>{articleHtml}</code></pre>
                    )}
                </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">参照元情報</h4>
              {sources.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {sources.map((source, index) => (
                    <li key={index}>
                      <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{source.title || source.uri}</a>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">{plan.type === PlanType.Normal || plan.type === PlanType.Affiliate ? '参照元情報はありませんでした。' : 'この記事は提供された参考資料に基づいて生成されました。'}</p>}
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800">
              <p><strong>免責事項:</strong> 本記事はAIによって生成されたものです。専門的な判断を必要とする場合は、必ず専門家にご相談ください。</p>
            </div>

            <div className="text-right">
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={handleSaveDraft}
                    className="bg-slate-200 text-slate-800 font-semibold py-3 px-6 rounded-md hover:bg-slate-300 transition-colors"
                  >
                    下書きとして保存
                  </button>
                  {wpProxyEnabled && (
                    <p className="text-xs text-slate-500 text-right sm:text-left">
                      WPプロキシ設定が有効です。WordPress側のCORS設定は不要です。
                    </p>
                  )}
                  <button
                      onClick={() => setIsPostModalOpen(true)}
                      className="bg-green-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-green-700 transition-colors disabled:bg-slate-400"
                      disabled={!wpProxyEnabled && (!wpCredentials.url || !wpCredentials.username || !wpCredentials.appPassword)}
                  >
                      WordPressに投稿する
                  </button>
                </div>
                {!wpProxyEnabled && (!wpCredentials.url || !wpCredentials.username || !wpCredentials.appPassword) && 
                    <p className="text-xs text-red-600 mt-1 text-right">WordPress連携設定が未完了です。投稿は未接続ですが、下書き保存は可能です。</p>
                }
            </div>
        </div>
      )}

      {isPostModalOpen && (
        <PostToWordPressModal
            isOpen={isPostModalOpen}
            onClose={() => setIsPostModalOpen(false)}
            onPost={handlePostComplete}
            articleTitle={selectedTitle}
            articleHtml={articleHtml}
            metaDescription={metaDescription}
            wpParams={{ credentials: wpCredentials }}
        />
      )}
    </div>
  );
};

export default ArticleGenerator;
