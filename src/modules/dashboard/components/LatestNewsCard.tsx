import React, { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';

interface LatestNewsPost {
  title: string;
  link: string;
  teaser: string;
  pubDate?: string;
  imageUrl?: string;
}

const isLatestNewsPost = (data: unknown): data is LatestNewsPost => {
  if (!data || typeof data !== 'object') return false;
  const post = data as Record<string, unknown>;
  return typeof post.title === 'string' && post.title.length > 0 && typeof post.link === 'string';
};

export const LatestNewsCard: React.FC = () => {
  const [post, setPost] = useState<LatestNewsPost | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadLatestNews = async () => {
      try {
        const response = await fetch('/api/latest-news', { signal: controller.signal });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (isLatestNewsPost(data)) setPost(data);
      } catch {
        // Feed unavailable — the card stays hidden
      }
    };

    loadLatestNews();
    return () => controller.abort();
  }, []);

  if (!post) return null;

  const publishedDate = post.pubDate ? parseISO(post.pubDate) : null;
  const showImage = Boolean(post.imageUrl) && !imageFailed;

  return (
    <a
      className="card latest-news-card"
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showImage && (
        <img
          className="latest-news-card__image"
          src={post.imageUrl}
          alt={post.title}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="latest-news-card__body">
        <span className="latest-news-card__label">Latest club news</span>
        <h3 className="latest-news-card__title">{post.title}</h3>
        {publishedDate && isValid(publishedDate) && (
          <time className="latest-news-card__date" dateTime={post.pubDate}>
            {format(publishedDate, 'd MMM yyyy')}
          </time>
        )}
        {post.teaser && <p className="latest-news-card__teaser">{post.teaser}</p>}
      </div>
    </a>
  );
};
