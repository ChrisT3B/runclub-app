import React from 'react';
import { useAuth } from '@/modules/auth/context/AuthContext';

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  description: string;
  category: 'member' | 'lirf';
}

const videos: Video[] = [
  // Member videos
  {
    id: '1',
    title: 'Welcome to Run Alcester - How to Register',
    youtubeId: 'YOUTUBE_ID_1', // Replace with actual YouTube video ID
    description: 'Learn how to create your account and get started with the app.',
    category: 'member',
  },
  {
    id: '2',
    title: 'How to Book a Run',
    youtubeId: 'YOUTUBE_ID_2',
    description: 'Step-by-step guide to browsing and booking runs.',
    category: 'member',
  },
  {
    id: '3',
    title: 'Managing Your Profile and Emergency Contacts',
    youtubeId: 'YOUTUBE_ID_3',
    description: 'Keep your details up to date for safety and communication.',
    category: 'member',
  },
  {
    id: '4',
    title: 'Understanding Credits and Payments',
    youtubeId: 'YOUTUBE_ID_4',
    description: 'How the payment system works and managing your credits.',
    category: 'member',
  },

  // LIRF videos
  {
    id: '5',
    title: 'How to View and Schedule Runs',
    youtubeId: 'YOUTUBE_ID_5',
    description: 'LIRF guide to creating and managing run schedules.',
    category: 'lirf',
  },
  {
    id: '6',
    title: 'How to Assign Yourself to a Run',
    youtubeId: 'YOUTUBE_ID_6',
    description: 'Step-by-step process for LIRF run assignments.',
    category: 'lirf',
  },
  {
    id: '7',
    title: 'Viewing Bookings and Marking Attendance',
    youtubeId: 'YOUTUBE_ID_7',
    description: 'How to manage bookings and track attendance for your runs.',
    category: 'lirf',
  },
  {
    id: '8',
    title: 'Troubleshooting Common Issues',
    youtubeId: 'YOUTUBE_ID_8',
    description: 'Solutions to frequent questions and technical issues.',
    category: 'lirf',
  },
];

function VideoCard({ video }: { video: Video }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="aspect-video">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
        <p className="text-gray-600 text-sm">{video.description}</p>
      </div>
    </div>
  );
}

export const HelpVideos: React.FC = () => {
  const { state, permissions } = useAuth();

  const isLirfOrAdmin = permissions?.accessLevel === 'lirf' || permissions?.accessLevel === 'admin';

  const memberVideos = videos.filter((v) => v.category === 'member');
  const lirfVideos = videos.filter((v) => v.category === 'lirf');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Help Videos</h1>
      <p className="text-gray-600 mb-8">
        Watch these short tutorials to get the most out of the Run Alcester app.
      </p>

      {/* Member Videos Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">For Members</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {memberVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>

      {/* LIRF Videos Section - Only shown to LIRFs and Admins */}
      {isLirfOrAdmin && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">For LIRFs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {lirfVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {!state.isAuthenticated && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">
            <strong>Note:</strong> Some advanced training videos are only available to LIRFs and club
            administrators. Please log in to see all available content.
          </p>
        </div>
      )}
    </div>
  );
};

export default HelpVideos;
