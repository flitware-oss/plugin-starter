import React from 'react';

type LoaderProps = React.HTMLAttributes<HTMLDivElement>;

export default function Loader(props: LoaderProps): React.ReactNode {
  return (
    <div {...props} className={`loader-container ${props.className ?? ''}`}>
      <div className="loader"></div>
    </div>
  );
}
