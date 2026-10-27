import { Company } from "@shared/protocol";
import React from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface CompanySelectionProps {
  companies: Company[];
  onCompanySelect: (company: Company) => void;
  onRequestMore?: () => void;
  isLoading?: boolean;
}

export const CompanySelection: React.FC<CompanySelectionProps> = ({
  companies,
  onCompanySelect,
  onRequestMore,
  isLoading = false,
}) => {
  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Here are some companies that match your needs:
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card
            key={company.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50"
            onClick={() => onCompanySelect(company)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">{company.name}</CardTitle>
              {company.questions && company.questions.length > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {company.questions.length} question{company.questions.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {company.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {onRequestMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onRequestMore}
            disabled={isLoading}
            className="w-full max-w-xs"
          >
            {isLoading ? "Loading more..." : "Show more companies"}
          </Button>
        </div>
      )}
    </div>
  );
};
