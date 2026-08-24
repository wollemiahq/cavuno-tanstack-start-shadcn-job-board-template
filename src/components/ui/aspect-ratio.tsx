import { cn } from '@/lib/utils';

type AspectRatioStyle = React.CSSProperties & {
  '--ratio': number;
};

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<'div'> & { ratio: number }) {
  const style: AspectRatioStyle = {
    '--ratio': ratio,
  };

  return (
    <div
      data-slot="aspect-ratio"
      style={style}
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  );
}

export { AspectRatio };
