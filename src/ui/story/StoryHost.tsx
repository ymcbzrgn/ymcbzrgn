/**
 * Listens for "open the story" (the welcome window, the palette, the terminal, /?story) and loads the
 * story only when somebody asks. Mounted by the desktop's overlay host and by the phone UI.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { STORY_EVENT, takeStoryRequest } from '../../os/events';

const Story = lazy(() => import('./Story'));

export default function StoryHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const request = () => {
      takeStoryRequest();
      setOpen(true);
    };
    if (takeStoryRequest() || new URLSearchParams(window.location.search).has('story')) setOpen(true);
    window.addEventListener(STORY_EVENT, request);
    return () => window.removeEventListener(STORY_EVENT, request);
  }, []);

  const close = () => {
    setOpen(false);
    // a link like /?story should not open it again on reload
    const url = new URL(window.location.href);
    if (url.searchParams.has('story')) {
      url.searchParams.delete('story');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  };

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <Story onClose={close} />
    </Suspense>
  );
}
