import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface LinkPreviewData {
 title: string;
 description: string;
 image: string;
 url: string;
 siteName?: string;
}

const previewCache: Record<string, LinkPreviewData> = {};

export const LinkPreview: React.FC<{ url: string }> = ({ url }) => {
 const [data, setData] = useState<LinkPreviewData | null>(previewCache[url] || null);
 const [loading, setLoading] = useState(!previewCache[url]);
 const [error, setError] = useState(false);

 useEffect(() => {
 if (previewCache[url]) {
 setData(previewCache[url]);
 setLoading(false);
 return;
 }

 let active = true;
 setLoading(true);
 setError(false);

 // Fetch the link preview from our server API Proxy
 fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
 .then((res) => {
 if (!res.ok) throw new Error('Failed to fetch link preview');
 return res.json();
 })
 .then((json) => {
 if (!active) return;
 if (json && (json.title || json.description)) {
 previewCache[url] = json;
 setData(json);
 } else {
 setError(true);
 }
 setLoading(false);
 })
 .catch((err) => {
 console.error('Failed to load link preview for:', url, err);
 if (active) {
 setError(true);
 setLoading(false);
 }
 });

 return () => {
 active = false;
 };
 }, [url]);

 if (loading) {
 return (
 <div className="flex items-center gap-3 p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/40 animate-pulse mt-2.5">
 <RefreshCw className="w-4 h-4 text-zinc-400 dark:text-zinc-500 animate-spin" />
 <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-mono">
 Resolving metadata for {(() => {
 try {
 return new URL(url).hostname;
 } catch (_) {
 return 'external link';
 }
 })()}...
 </span>
 </div>
 );
 }

 if (error || !data) {
 return null;
 }

 let domain = '';
 try {
 domain = new URL(data.url).hostname.replace('www.', '');
 } catch (_) {
 domain = data.siteName || '';
 }

 return (
 <a
 href={data.url}
 target="_blank"
 rel="noopener noreferrer"
 className="block mt-3 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-250 select-none group"
 >
 <div className="flex flex-col sm:flex-row">
 {data.image && (
 <div className="sm:w-36 md:w-44 h-28 sm:h-auto shrink-0 relative bg-zinc-100 dark:bg-zinc-800 overflow-hidden border-b sm:border-b-0 sm:">
 <img
 src={data.image}
 alt={data.title}
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
 referrerPolicy="no-referrer"
 />
 </div>
 )}
 <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
 <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider font-mono">
 <span>{domain}</span>
 <ExternalLink className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
 </div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 mt-0.5 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors leading-snug">
 {data.title}
 </h4>
 {data.description && (
 <p className="text-zinc-500 dark:text-zinc-400 text-[11px] line-clamp-2 leading-relaxed mt-1">
 {data.description}
 </p>
 )}
 </div>
 </div>
 </a>
 );
};
