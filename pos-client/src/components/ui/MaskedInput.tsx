import { forwardRef } from 'react';
import { Input, InputProps } from './Input';

export const MaskedInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input {...props} ref={ref} />
));

MaskedInput.displayName = 'MaskedInput'; 