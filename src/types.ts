export interface ICheckOptions {
  cwd?: string;
}

export interface IOutdatedPackage {
  name: string;
  current: string;
  latest: string;
}

export interface ICheckResult {
  passed: boolean;
  packages: IOutdatedPackage[];
}
