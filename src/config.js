window.RobotLearnConfig = (() => {
  const deg = Math.PI / 180;
  const commonLimits = [
    [-180, 180],
    [-90, 150],
    [-180, 75],
    [-400, 400],
    [-125, 120],
    [-400, 400]
  ];

  const variants = {
    '60_205': {
      label: 'IRB 4600-60/2.05', payload: 60, reach: 2.05,
      offsets: [[0,0,0.495],[0.175,0,0],[0,0,0.900],[0,0,0.175],[0.960,0,0],[0.135,0,0]],
      limitsDeg: commonLimits,
      maxSpeedDeg: [175,175,175,250,250,360]
    },
    '45_205': {
      label: 'IRB 4600-45/2.05', payload: 45, reach: 2.05,
      offsets: [[0,0,0.495],[0.175,0,0],[0,0,0.900],[0,0,0.175],[0.960,0,0],[0.135,0,0]],
      limitsDeg: commonLimits,
      maxSpeedDeg: [175,175,175,250,250,360]
    },
    '40_255': {
      label: 'IRB 4600-40/2.55', payload: 40, reach: 2.55,
      offsets: [[0,0,0.495],[0.175,0,0],[0,0,1.095],[0,0,0.175],[1.270,0,0],[0.135,0,0]],
      limitsDeg: commonLimits,
      maxSpeedDeg: [175,175,175,250,250,360]
    },
    '20_250': {
      label: 'IRB 4600-20/2.50', payload: 20, reach: 2.50,
      offsets: [[0,0,0.495],[0.175,0,0],[0,0,1.095],[0,0,0.175],[1.2305,0,0],[0.085,0,0]],
      limitsDeg: [[-180,180],[-90,150],[-180,75],[-400,400],[-120,120],[-400,400]],
      maxSpeedDeg: [175,175,175,360,360,500]
    }
  };

  Object.values(variants).forEach(v => {
    v.limits = v.limitsDeg.map(([a,b]) => [a*deg,b*deg]);
    v.maxSpeed = v.maxSpeedDeg.map(x => x*deg);
  });

  return { variants, deg };
})();
