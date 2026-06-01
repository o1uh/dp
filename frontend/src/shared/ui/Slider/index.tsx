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
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={`relative w-full h-5 flex items-center ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="
          absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10
        "
        {...props}
      />
      {/* Track Background */}
      <div className="w-full h-1 bg-background-deep rounded-full overflow-hidden">
        {/* Fill */}
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Thumb visual */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg border-2 border-primary 
                   pointer-events-none transition-transform duration-100 group-hover:scale-125"
        style={{ left: `calc(${pct}% - 7px)` }}
      />
    </div>
  );
};