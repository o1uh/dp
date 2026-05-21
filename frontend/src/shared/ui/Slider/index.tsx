import React from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ 
  value, 
  min = 0, 
  max = 100, 
  step = 1, 
  onChange, 
  className = '', 
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleChange}
      className={`
        w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer outline-none transition-all duration-150
        
        /* Стилизация ползунка (Thumb) под Webkit */
        [&::-webkit-slider-thumb]:appearance-none 
        [&::-webkit-slider-thumb]:w-3 
        [&::-webkit-slider-thumb]:h-3 
        [&::-webkit-slider-thumb]:rounded-full 
        [&::-webkit-slider-thumb]:bg-primary 
        [&::-webkit-slider-thumb]:transition-all 
        [&::-webkit-slider-thumb]:duration-150
        hover:[&::-webkit-slider-thumb]:scale-125 
        hover:[&::-webkit-slider-thumb]:bg-white
        
        /* Стилизация ползунка (Thumb) под Firefox */
        [&::-moz-range-thumb]:border-0 
        [&::-moz-range-thumb]:w-3 
        [&::-moz-range-thumb]:h-3 
        [&::-moz-range-thumb]:rounded-full 
        [&::-moz-range-thumb]:bg-primary 
        [&::-moz-range-thumb]:transition-all 
        [&::-moz-range-thumb]:duration-150
        hover:[&::-moz-range-thumb]:scale-125 
        hover:[&::-moz-range-thumb]:bg-white
        
        ${className}
      `}
      {...props}
    />
  );
};