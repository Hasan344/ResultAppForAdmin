using FluentValidation;
using ResultAppForAdmin.Api.Application.DTOs;
using ResultAppForAdmin.Api.Application.Services;

namespace ResultAppForAdmin.Api.Application.Validators;

public class UpsertResultDtoValidator : AbstractValidator<UpsertResultDto>
{
    public UpsertResultDtoValidator()
    {
        RuleFor(x => x.StudentId).GreaterThan(0);
        RuleFor(x => x.ExerciseId).GreaterThan(0);
        RuleFor(x => x.RawValue).GreaterThanOrEqualTo(0).When(x => x.RawValue.HasValue);
        RuleFor(x => x.FinalScoreOverride)
            .InclusiveBetween((byte)0, (byte)10)
            .When(x => x.FinalScoreOverride.HasValue);
    }
}

public class CreateScoringRuleRequestValidator : AbstractValidator<CreateScoringRuleRequest>
{
    public CreateScoringRuleRequestValidator()
    {
        RuleFor(x => x.CommissionNo).NotEmpty().MaximumLength(10);
        RuleFor(x => x.ExerciseId).GreaterThan(0);
        RuleFor(x => x.Gender).Must(g => g == 1 || g == 2).WithMessage("Gender must be 1 (kişi) or 2 (qadın)");
        RuleFor(x => x.AgeMin).LessThanOrEqualTo(x => x.AgeMax);
        RuleFor(x => x.Threshold).GreaterThan(0);
        RuleFor(x => x.Score).InclusiveBetween((byte)6, (byte)10);
    }
}
