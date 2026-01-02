
import React from 'react';

export const ActNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="w-[800px] h-[500px] bg-slate-950/20 border-[4px] border-slate-800 rounded-3xl relative">
      <div className="absolute -top-6 left-6 px-4 py-1 bg-slate-800 rounded-full border border-slate-700 shadow-xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Act: {data.label}</span>
      </div>
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-700 m-2 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-700 m-2 rounded-br-xl" />
    </div>
  );
};
