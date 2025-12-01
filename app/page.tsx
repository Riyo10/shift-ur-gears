'use client'; // This directive is required for Next.js App Router when using hooks

import BikeGame from '../app/components/BikeGame';

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-gray-900">
      <BikeGame />
    </main>
  );
}